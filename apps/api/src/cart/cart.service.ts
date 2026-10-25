import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

const DELIVERY_FEE = 25;
const FREE_DELIVERY_THRESHOLD = 199;
const MAX_MEMBERS = 10;
const MAX_LINE_ITEMS = 100;
const INVITE_VALID_HOURS = 24;
const LOCK_HOLD_MINUTES = 15;

const MEMBER_COLORS = ['#F2B705', '#D7372B', '#2F5D3A', '#C9714A', '#6FA67B', '#E85A4F', '#D98B66', '#F5C431', '#1B1A17', '#2A2822'];

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private nextExpiry() {
    return new Date(Date.now() + 48 * 60 * 60 * 1000);
  }

  async createSoloCart(userId: string, storeId: string, addressId?: string) {
    const cart = await this.prisma.cart.create({
      data: {
        type: 'solo',
        hostId: userId,
        storeId,
        addressId,
        expiresAt: this.nextExpiry(),
        members: { create: { userId, role: 'host', color: MEMBER_COLORS[0] } },
      },
    });
    return this.getCartState(cart.id);
  }

  async createSharedCart(userId: string, storeId: string, name: string, addressId?: string) {
    const inviteCode = randomBytes(4).toString('hex');
    const cart = await this.prisma.cart.create({
      data: {
        type: 'shared',
        name,
        hostId: userId,
        storeId,
        addressId,
        inviteCode,
        expiresAt: this.nextExpiry(),
        members: { create: { userId, role: 'host', color: MEMBER_COLORS[0] } },
      },
    });
    return this.getCartState(cart.id);
  }

  async joinByInvite(inviteCode: string, userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { inviteCode },
      include: { members: true },
    });
    if (!cart) throw new NotFoundException('Invite not found');
    if (cart.status !== 'open') throw new BadRequestException('This Tokri is no longer open for joining');

    const inviteAgeHours = (Date.now() - cart.createdAt.getTime()) / (1000 * 60 * 60);
    if (inviteAgeHours > INVITE_VALID_HOURS) throw new BadRequestException('This invite link has expired');

    const alreadyMember = cart.members.some((m) => m.userId === userId);
    if (!alreadyMember) {
      if (cart.members.length >= MAX_MEMBERS) throw new BadRequestException('This Tokri is full');
      const color = MEMBER_COLORS[cart.members.length % MEMBER_COLORS.length];
      await this.prisma.cartMember.create({ data: { cartId: cart.id, userId, role: 'member', color } });
      await this.bumpVersion(cart.id);
    }

    return this.getCartState(cart.id);
  }

  async addItem(cartId: string, userId: string, variantId: string, qty: number, note?: string) {
    const cart = await this.requireOpenCart(cartId);
    await this.requireMember(cartId, userId);

    const itemCount = await this.prisma.cartItem.count({ where: { cartId } });
    if (itemCount >= MAX_LINE_ITEMS) throw new BadRequestException('This cart is full');

    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
      include: { inventory: { where: { storeId: cart.storeId } } },
    });
    if (!variant) throw new NotFoundException('Item not found');

    const item = await this.prisma.cartItem.create({
      data: { cartId, variantId, addedBy: userId, qty, note, source: 'manual' },
    });
    const version = await this.bumpVersion(cartId);
    return { item: await this.serializeItem(item.id), version };
  }

  async updateItemQty(cartId: string, itemId: string, userId: string, qty: number) {
    await this.requireOpenCart(cartId);
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cartId) throw new NotFoundException('Item not found');
    if (item.addedBy !== userId) throw new ForbiddenException('You can only edit items you added');

    await this.prisma.cartItem.update({ where: { id: itemId }, data: { qty } });
    const version = await this.bumpVersion(cartId);
    return { item: await this.serializeItem(itemId), version };
  }

  async removeItem(cartId: string, itemId: string, userId: string, isHost: boolean) {
    await this.requireOpenCart(cartId);
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cartId) throw new NotFoundException('Item not found');
    if (item.addedBy !== userId && !isHost) throw new ForbiddenException('You can only remove items you added');

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    const version = await this.bumpVersion(cartId);
    return { version };
  }

  async reactToItem(cartId: string, itemId: string, userId: string, value: 'up' | 'down') {
    await this.requireMember(cartId, userId);
    await this.prisma.cartItemReaction.upsert({
      where: { cartItemId_userId: { cartItemId: itemId, userId } },
      update: { value },
      create: { cartItemId: itemId, userId, value },
    });
    const version = await this.bumpVersion(cartId);
    return { item: await this.serializeItem(itemId), version };
  }

  async setMemberDone(cartId: string, userId: string, isDone: boolean) {
    await this.prisma.cartMember.update({
      where: { cartId_userId: { cartId, userId } },
      data: { isDone },
    });
    return this.bumpVersion(cartId);
  }

  async lockCart(cartId: string, userId: string) {
    const cart = await this.requireHost(cartId, userId);
    if (cart.status !== 'open') throw new BadRequestException('Cart already locked or ordered');

    const items = await this.prisma.cartItem.findMany({ where: { cartId } });
    for (const item of items) {
      await this.prisma.inventory.updateMany({
        where: { storeId: cart.storeId, variantId: item.variantId },
        data: { qtyReserved: { increment: item.qty } },
      });
    }

    await this.prisma.cart.update({ where: { id: cartId }, data: { status: 'locked', lockedAt: new Date() } });
    const version = await this.bumpVersion(cartId);
    return { version, holdExpiresInMinutes: LOCK_HOLD_MINUTES };
  }

  async setBudgetCap(cartId: string, userId: string, budgetCap: number | null) {
    await this.requireHost(cartId, userId);
    await this.prisma.cart.update({ where: { id: cartId }, data: { budgetCap } });
    return this.bumpVersion(cartId);
  }

  async setSplitMode(cartId: string, userId: string, splitMode: 'host_pays_all' | 'pay_for_own' | 'split_equally' | 'custom') {
    await this.requireHost(cartId, userId);
    await this.prisma.cart.update({ where: { id: cartId }, data: { splitMode } });
    const version = await this.bumpVersion(cartId);
    const shares = await this.computeShares(cartId);
    return { splitMode, shares, version };
  }

  async computeShares(cartId: string) {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: { items: { include: { variant: true } }, members: true },
    });

    const subtotal = cart.items.reduce((sum, i) => sum + i.variant.price * i.qty, 0);
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    const total = subtotal + deliveryFee;
    const memberCount = cart.members.length || 1;

    if (cart.splitMode === 'host_pays_all') {
      return cart.members.map((m) => ({ userId: m.userId, amount: m.userId === cart.hostId ? total : 0 }));
    }
    if (cart.splitMode === 'split_equally') {
      const per = Math.round((total / memberCount) * 100) / 100;
      return cart.members.map((m) => ({ userId: m.userId, amount: per }));
    }
    if (cart.splitMode === 'pay_for_own') {
      const feeShare = deliveryFee / memberCount;
      return cart.members.map((m) => {
        const own = cart.items.filter((i) => i.addedBy === m.userId).reduce((s, i) => s + i.variant.price * i.qty, 0);
        return { userId: m.userId, amount: Math.round((own + feeShare) * 100) / 100 };
      });
    }
    // custom: default to equal split until host assigns explicit amounts via payments module
    const per = Math.round((total / memberCount) * 100) / 100;
    return cart.members.map((m) => ({ userId: m.userId, amount: per }));
  }

  async transferHost(cartId: string, currentHostId: string, newHostId: string) {
    const cart = await this.requireHost(cartId, currentHostId);
    await this.requireMember(cartId, newHostId);

    await this.prisma.$transaction([
      this.prisma.cart.update({ where: { id: cartId }, data: { hostId: newHostId } }),
      this.prisma.cartMember.update({ where: { cartId_userId: { cartId, userId: currentHostId } }, data: { role: 'member' } }),
      this.prisma.cartMember.update({ where: { cartId_userId: { cartId, userId: newHostId } }, data: { role: 'host' } }),
    ]);
    return this.bumpVersion(cartId);
  }

  async removeMember(cartId: string, hostId: string, userId: string) {
    await this.requireHost(cartId, hostId);
    await this.prisma.cartMember.delete({ where: { cartId_userId: { cartId, userId } } });
    return this.bumpVersion(cartId);
  }

  async leaveCart(cartId: string, userId: string) {
    await this.prisma.cartMember.delete({ where: { cartId_userId: { cartId, userId } } });
    return this.bumpVersion(cartId);
  }

  private async requireOpenCart(cartId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId } });
    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.status !== 'open') throw new BadRequestException('This cart is locked');
    return cart;
  }

  private async requireMember(cartId: string, userId: string) {
    const member = await this.prisma.cartMember.findUnique({ where: { cartId_userId: { cartId, userId } } });
    if (!member) throw new ForbiddenException('You are not a member of this cart');
    return member;
  }

  private async requireHost(cartId: string, userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId } });
    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.hostId !== userId) throw new ForbiddenException('Only the host can do this');
    return cart;
  }

  private async bumpVersion(cartId: string): Promise<number> {
    const updated = await this.prisma.cart.update({ where: { id: cartId }, data: { version: { increment: 1 } } });
    return updated.version;
  }

  private async serializeItem(itemId: string) {
    const item = await this.prisma.cartItem.findUniqueOrThrow({
      where: { id: itemId },
      include: { variant: { include: { product: { include: { category: true } } } }, reactions: true },
    });
    return {
      id: item.id,
      cartId: item.cartId,
      variantId: item.variantId,
      name: `${item.variant.product.name} (${item.variant.size})`,
      image: item.variant.product.images[0] ?? null,
      price: item.variant.price,
      mrp: item.variant.mrp,
      qty: item.qty,
      addedBy: item.addedBy,
      note: item.note,
      source: item.source,
      inStock: true,
      createdAt: item.createdAt.toISOString(),
      categorySlug: item.variant.product.category.slug,
      subcategory: item.variant.product.subcategory,
      reactions: item.reactions.map((r) => ({ userId: r.userId, value: r.value })),
    };
  }

  async getCartState(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        members: { include: { user: true } },
        items: { include: { variant: { include: { product: { include: { category: true } } } }, reactions: true } },
      },
    });
    if (!cart) throw new NotFoundException('Cart not found');

    return {
      id: cart.id,
      type: cart.type,
      name: cart.name,
      hostId: cart.hostId,
      storeId: cart.storeId,
      addressId: cart.addressId,
      status: cart.status,
      budgetCap: cart.budgetCap,
      splitMode: cart.splitMode,
      inviteCode: cart.inviteCode,
      version: cart.version,
      members: cart.members.map((m) => ({
        userId: m.userId,
        name: m.user.name ?? (m.user.phone ? `+91 ${m.user.phone.slice(-4).padStart(10, 'X')}` : m.user.email ?? 'Member'),
        role: m.role,
        color: m.color,
        isDone: m.isDone,
        joinedAt: m.joinedAt.toISOString(),
      })),
      items: cart.items.map((item) => ({
        id: item.id,
        cartId: item.cartId,
        variantId: item.variantId,
        name: `${item.variant.product.name} (${item.variant.size})`,
        image: item.variant.product.images[0] ?? null,
        price: item.variant.price,
        mrp: item.variant.mrp,
        qty: item.qty,
        addedBy: item.addedBy,
        note: item.note,
        source: item.source,
        inStock: true,
        createdAt: item.createdAt.toISOString(),
        categorySlug: item.variant.product.category.slug,
        subcategory: item.variant.product.subcategory,
        reactions: item.reactions.map((r) => ({ userId: r.userId, value: r.value })),
      })),
    };
  }

  async bill(cartId: string) {
    const cart = await this.prisma.cart.findUniqueOrThrow({ where: { id: cartId }, include: { items: { include: { variant: true } } } });
    const subtotal = cart.items.reduce((sum, i) => sum + i.variant.price * i.qty, 0);
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
    return { subtotal, deliveryFee, total: subtotal + deliveryFee, freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD, amountToFreeDelivery };
  }
}
