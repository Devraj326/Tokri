import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForProduct(productId: string) {
    const [reviews, agg] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: true },
      }),
      this.prisma.review.aggregate({ where: { productId }, _avg: { rating: true }, _count: { _all: true } }),
    ]);

    return {
      average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
      count: agg._count._all,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        text: r.text,
        createdAt: r.createdAt,
        userName: r.user.name ?? 'Tokri user',
      })),
    };
  }

  async create(userId: string, productId: string, data: { rating: number; text?: string; orderId?: string }) {
    if (data.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: data.orderId },
        include: { cart: { include: { items: { include: { variant: true } } } } },
      });
      if (!order || order.userId !== userId) throw new ForbiddenException('Not your order');
      const hasProduct = order.cart.items.some((i) => i.variant.productId === productId);
      if (!hasProduct) throw new BadRequestException('This product was not part of that order');
    }

    const existing = await this.prisma.review.findFirst({ where: { productId, userId, orderId: data.orderId ?? null } });
    if (existing) {
      return this.prisma.review.update({ where: { id: existing.id }, data: { rating: data.rating, text: data.text } });
    }
    return this.prisma.review.create({
      data: { productId, userId, orderId: data.orderId, rating: data.rating, text: data.text },
    });
  }
}
