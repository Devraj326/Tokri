import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive() {
    const coupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    return coupons
      .filter((c) => c.usageLimit == null || c.usedCount < c.usageLimit)
      .map((c) => ({
        code: c.code,
        description: c.description,
        discountType: c.discountType,
        value: c.value,
        minOrderValue: c.minOrderValue,
        maxDiscount: c.maxDiscount,
        expiresAt: c.expiresAt,
      }));
  }
}
