import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { id: user.id, phone: user.phone, email: user.email, name: user.name };
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string }) {
    try {
      const user = await this.prisma.user.update({ where: { id: userId }, data });
      return { id: user.id, phone: user.phone, email: user.email, name: user.name };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('That phone number is already linked to another account');
      }
      throw err;
    }
  }

  async listAddresses(userId: string) {
    return this.prisma.address.findMany({ where: { userId } });
  }

  async createAddress(userId: string, data: { label: string; lat: number; lng: number; line1: string; storeId?: string }) {
    return this.prisma.address.create({ data: { userId, ...data } });
  }

  async pantryItems(userId: string) {
    return this.prisma.pantryItem.findMany({ where: { userId } });
  }

  async addPantryItem(userId: string, name: string, kind: 'pantry' | 'tool') {
    return this.prisma.pantryItem.create({ data: { userId, name, kind } });
  }
}
