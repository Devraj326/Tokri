import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async nearestStore(lat: number, lng: number) {
    const stores = await this.prisma.store.findMany({ where: { isOpen: true } });
    let best: { id: string; name: string; distanceKm: number } | null = null;

    for (const s of stores) {
      const distanceKm = haversineKm(lat, lng, s.lat, s.lng);
      if (!best || distanceKm < best.distanceKm) best = { id: s.id, name: s.name, distanceKm };
      if (!best) continue;
    }

    if (!best) return { serviceable: false };

    const store = stores.find((s) => s.id === best!.id)!;
    const serviceable = best.distanceKm <= store.radiusKm;
    const etaMinutes = serviceable ? Math.min(45, Math.max(8, Math.round(10 + best.distanceKm))) : null;

    return {
      serviceable,
      storeId: serviceable ? store.id : null,
      storeName: serviceable ? store.name : null,
      distanceKm: Math.round(best.distanceKm * 10) / 10,
      etaMinutes,
    };
  }

  async categories() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: { children: true },
      orderBy: { name: 'asc' },
    });
  }

  async products(params: { categorySlug?: string; storeId: string }) {
    const where = params.categorySlug ? { category: { slug: params.categorySlug } } : {};
    const products = await this.prisma.product.findMany({
      where,
      include: {
        variants: {
          include: { inventory: { where: { storeId: params.storeId } } },
        },
        category: true,
      },
      orderBy: { name: 'asc' },
      // A single category tops out around ~900 products in this catalog; a
      // category listing needs the full set for subcategory grouping/filters
      // to be meaningful. Unscoped listing (no category) stays capped.
      take: params.categorySlug ? 1000 : 100,
    });
    return products.map((p) => this.serializeProduct(p, params.storeId));
  }

  async product(id: string, storeId: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: { include: { inventory: { where: { storeId } } } },
        category: true,
      },
    });
    if (!p) return null;
    return this.serializeProduct(p, storeId);
  }

  private serializeProduct(
    p: Awaited<ReturnType<typeof this.prisma.product.findFirst>> & {
      variants: any[];
      category: { name: string; slug: string };
    },
    storeId: string,
  ) {
    return {
      id: p!.id,
      name: p!.name,
      hindiName: p!.hindiName,
      brand: p!.brand,
      unit: p!.unit,
      tileColor: p!.tileColor,
      isVeg: p!.isVeg,
      subcategory: p!.subcategory,
      category: p!.category,
      variants: p!.variants.map((v: any) => ({
        id: v.id,
        size: v.size,
        mrp: v.mrp,
        price: v.price,
        qtyAvailable: v.inventory.find((i: any) => i.storeId === storeId)?.qtyAvailable ?? 0,
      })),
    };
  }

  async search(query: string, storeId: string) {
    const term = query.trim();
    if (!term) return [];

    const aliasMatches = await this.prisma.productAlias.findMany({
      where: { alias: { contains: term, mode: 'insensitive' } },
      take: 10,
    });
    const canonicalNames = aliasMatches.map((a) => a.canonical);

    const direct = await this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { hindiName: { contains: term, mode: 'insensitive' } },
          { aliases: { has: term.toLowerCase() } },
          ...(canonicalNames.length ? [{ name: { in: canonicalNames } }] : []),
        ],
      },
      include: { variants: { include: { inventory: { where: { storeId } } } }, category: true },
      take: 20,
    });

    if (direct.length > 0) {
      return direct.map((p) => this.serializeProduct(p, storeId));
    }

    // typo-tolerant fallback via pg_trgm similarity
    const fuzzy = await this.prisma.$queryRaw<{ id: string; similarity: number }[]>`
      SELECT id, similarity(name, ${term}) AS similarity
      FROM products
      WHERE similarity(name, ${term}) > 0.2
      ORDER BY similarity DESC
      LIMIT 20
    `;
    if (fuzzy.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: fuzzy.map((f) => f.id) } },
      include: { variants: { include: { inventory: { where: { storeId } } } }, category: true },
    });
    return products.map((p) => this.serializeProduct(p, storeId));
  }
}
