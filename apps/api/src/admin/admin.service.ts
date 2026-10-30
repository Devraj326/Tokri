import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

function parsePage(limit?: string, offset?: string) {
  return { take: limit ? Number(limit) : 30, skip: offset ? Number(offset) : 0 };
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Overview ----------

  async stats() {
    const [users, products, categories, stores, orders, ordersByStatus, revenue, coupons, reviews, avgRating] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.product.count(),
      this.prisma.category.count(),
      this.prisma.store.count(),
      this.prisma.order.count(),
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.order.aggregate({ _sum: { total: true } }),
      this.prisma.coupon.count(),
      this.prisma.review.count(),
      this.prisma.review.aggregate({ _avg: { rating: true } }),
    ]);
    return {
      users,
      products,
      categories,
      stores,
      orders,
      revenueTotal: revenue._sum.total ?? 0,
      ordersByStatus: Object.fromEntries(ordersByStatus.map((g) => [g.status, g._count._all])),
      coupons,
      reviews,
      avgRating: avgRating._avg.rating ? Math.round(avgRating._avg.rating * 10) / 10 : 0,
    };
  }

  // ---------- Users ----------

  async listUsers(params: { search?: string; limit?: string; offset?: string }) {
    const where: Prisma.UserWhereInput = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
          ],
        }
      : {};
    const { take, skip } = parsePage(params.limit, params.offset);
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { _count: { select: { orders: true, hostedCarts: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        addresses: true,
        orders: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { orders: true, hostedCarts: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUser(id: string, data: { name?: string; email?: string; phone?: string }) {
    try {
      return await this.prisma.user.update({ where: { id }, data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('That email or phone is already linked to another account');
      }
      throw err;
    }
  }

  async deleteUser(id: string) {
    try {
      await this.prisma.user.delete({ where: { id } });
      return { ok: true };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new BadRequestException('Cannot delete a user with existing orders or carts');
      }
      throw err;
    }
  }

  // ---------- Products ----------

  async listProducts(params: { search?: string; category?: string; limit?: string; offset?: string }) {
    const where: Prisma.ProductWhereInput = {
      ...(params.category ? { category: { slug: params.category } } : {}),
      ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
    };
    const { take, skip } = parsePage(params.limit, params.offset);
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        take,
        skip,
        include: { category: true, variants: { include: { inventory: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total };
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, variants: { include: { inventory: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async createProduct(data: {
    name: string;
    hindiName?: string;
    categoryId: string;
    subcategory?: string;
    brand?: string;
    unit: string;
    tileColor?: string;
    isVeg?: boolean;
    aliases?: string[];
  }) {
    return this.prisma.product.create({ data, include: { category: true, variants: true } });
  }

  async updateProduct(id: string, data: Partial<Prisma.ProductUpdateInput>) {
    try {
      return await this.prisma.product.update({
        where: { id },
        data,
        include: { category: true, variants: { include: { inventory: true } } },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Product not found');
      }
      throw err;
    }
  }

  async deleteProduct(id: string) {
    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
  }

  async createVariant(productId: string, data: { size: string; mrp: number; price: number }) {
    const stores = await this.prisma.store.findMany();
    return this.prisma.variant.create({
      data: {
        ...data,
        productId,
        inventory: { createMany: { data: stores.map((s) => ({ storeId: s.id, qtyAvailable: 0 })) } },
      },
      include: { inventory: true },
    });
  }

  async updateVariant(id: string, data: { size?: string; mrp?: number; price?: number }) {
    return this.prisma.variant.update({ where: { id }, data, include: { inventory: true } });
  }

  async deleteVariant(id: string) {
    await this.prisma.variant.delete({ where: { id } });
    return { ok: true };
  }

  async upsertInventory(variantId: string, storeId: string, qtyAvailable: number) {
    return this.prisma.inventory.upsert({
      where: { storeId_variantId: { storeId, variantId } },
      create: { storeId, variantId, qtyAvailable },
      update: { qtyAvailable },
    });
  }

  // ---------- Categories ----------

  async listCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { parent: true, _count: { select: { products: true } } },
    });
  }

  async createCategory(data: { name: string; hindiName?: string; slug: string; parentId?: string }) {
    try {
      return await this.prisma.category.create({ data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('That slug is already in use');
      }
      throw err;
    }
  }

  async updateCategory(id: string, data: { name?: string; hindiName?: string; slug?: string; parentId?: string }) {
    try {
      return await this.prisma.category.update({ where: { id }, data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('That slug is already in use');
      }
      throw err;
    }
  }

  async deleteCategory(id: string) {
    try {
      await this.prisma.category.delete({ where: { id } });
      return { ok: true };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new BadRequestException('Cannot delete a category that still has products');
      }
      throw err;
    }
  }

  // ---------- Orders ----------

  async listOrders(params: { status?: string; limit?: string; offset?: string }) {
    const where: Prisma.OrderWhereInput = params.status ? { status: params.status as any } : {};
    const { take, skip } = parsePage(params.limit, params.offset);
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { user: true, store: true, payments: true },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total };
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        store: true,
        payments: { include: { payer: true } },
        cart: { include: { items: { include: { variant: { include: { product: true } } } } } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateOrderStatus(id: string, status: 'confirmed' | 'packing' | 'out_for_delivery' | 'delivered') {
    return this.prisma.order.update({ where: { id }, data: { status } });
  }

  // ---------- Stores ----------

  async listStores() {
    return this.prisma.store.findMany({ orderBy: { name: 'asc' } });
  }

  async createStore(data: { name: string; lat: number; lng: number; radiusKm?: number; isOpen?: boolean }) {
    return this.prisma.store.create({ data });
  }

  async updateStore(id: string, data: { name?: string; lat?: number; lng?: number; radiusKm?: number; isOpen?: boolean }) {
    return this.prisma.store.update({ where: { id }, data });
  }

  // ---------- Coupons ----------

  async listCoupons() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createCoupon(data: {
    code: string;
    description?: string;
    discountType: 'flat' | 'percent';
    value: number;
    minOrderValue?: number;
    maxDiscount?: number;
    expiresAt?: string;
    usageLimit?: number;
  }) {
    try {
      return await this.prisma.coupon.create({
        data: {
          ...data,
          code: data.code.trim().toUpperCase(),
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('That coupon code already exists');
      }
      throw err;
    }
  }

  async updateCoupon(
    id: string,
    data: {
      description?: string;
      discountType?: 'flat' | 'percent';
      value?: number;
      minOrderValue?: number;
      maxDiscount?: number;
      isActive?: boolean;
      expiresAt?: string;
      usageLimit?: number;
    },
  ) {
    return this.prisma.coupon.update({
      where: { id },
      data: { ...data, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined },
    });
  }

  async deleteCoupon(id: string) {
    await this.prisma.coupon.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- Reviews ----------

  async listReviews(params: { limit?: string; offset?: string }) {
    const { take, skip } = parsePage(params.limit, params.offset);
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { product: true, user: true },
      }),
      this.prisma.review.count(),
    ]);
    return { items, total };
  }

  async deleteReview(id: string) {
    await this.prisma.review.delete({ where: { id } });
    return { ok: true };
  }

  async deleteStore(id: string) {
    try {
      await this.prisma.store.delete({ where: { id } });
      return { ok: true };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new BadRequestException('Cannot delete a store that still has orders or inventory');
      }
      throw err;
    }
  }
}
