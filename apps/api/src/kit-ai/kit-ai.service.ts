import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CartService } from '../cart/cart.service.js';
import { geminiUnderstand } from './gemini-understand.js';
import { mockUnderstand, type UnderstoodItem, type UnderstoodKit } from './understand.js';

const MAX_KIT_REQUESTS_PER_HOUR = 20;
const PANTRY_STAPLES = ['oil', 'salt', 'water', 'sugar', 'screwdriver', 'scissors', 'glue stick'];

export interface ResolvedKitItem {
  name: string;
  hindiAlias: string | null;
  qty: number;
  unit: string;
  essential: boolean;
  bucket: 'in_stock' | 'swap' | 'not_on_tokri' | 'probably_at_home';
  reason: string | null;
  matchedVariantId: string | null;
  matchedName: string | null;
  image: string | null;
  price: number | null;
  confidence: number;
}

function normalizeKey(prompt: string, servings: number | null): string {
  return `${prompt.trim().toLowerCase().replace(/\s+/g, ' ')}|${servings ?? ''}`;
}

@Injectable()
export class KitAiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly cartService: CartService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async checkRateLimit(userId: string) {
    const key = `kit:rate:${userId}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 3600);
    if (count > MAX_KIT_REQUESTS_PER_HOUR) {
      throw new BadRequestException('You have hit the hourly limit for kit requests. Try again later.');
    }
  }

  private async understand(prompt: string, servings?: number): Promise<UnderstoodKit> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    let result: UnderstoodKit;
    if (apiKey) {
      try {
        result = await geminiUnderstand(prompt, apiKey);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[kit-ai] Gemini call failed, falling back to mock:', err instanceof Error ? err.message : err);
        result = mockUnderstand(prompt);
      }
    } else {
      result = mockUnderstand(prompt);
    }
    if (servings && result.goalType === 'recipe' && result.servings) {
      const factor = servings / result.servings;
      result = {
        ...result,
        servings,
        items: result.items.map((i) => ({ ...i, qty: Math.round(i.qty * factor * 100) / 100 })),
      };
    }
    return result;
  }

  private async matchItem(item: UnderstoodItem, storeId: string): Promise<ResolvedKitItem> {
    const isPantryStaple = PANTRY_STAPLES.some((s) => item.name.toLowerCase().includes(s));
    const base = {
      name: item.name,
      hindiAlias: item.hindiAlias ?? null,
      qty: item.qty,
      unit: item.unit,
      essential: item.essential,
    };

    const direct = await this.findBestVariant(item.name, storeId);
    if (direct && direct.confidence >= 0.8) {
      return {
        ...base,
        bucket: 'in_stock',
        reason: null,
        matchedVariantId: direct.variantId,
        matchedName: direct.name,
        image: direct.image,
        price: direct.price,
        confidence: direct.confidence,
      };
    }

    for (const sub of item.substitutes ?? []) {
      const subMatch = await this.findBestVariant(sub, storeId);
      if (subMatch) {
        return {
          ...base,
          bucket: 'swap',
          reason: `Out of ${item.name} — try ${sub}`,
          matchedVariantId: subMatch.variantId,
          matchedName: subMatch.name,
          image: subMatch.image,
          price: subMatch.price,
          confidence: subMatch.confidence,
        };
      }
    }

    if (isPantryStaple) {
      return {
        ...base,
        bucket: 'probably_at_home',
        reason: null,
        matchedVariantId: direct?.variantId ?? null,
        matchedName: direct?.name ?? null,
        image: direct?.image ?? null,
        price: direct?.price ?? null,
        confidence: direct?.confidence ?? 0,
      };
    }

    // A fuzzy ("contains") match exists but wasn't confident enough to call it a direct hit —
    // still useful to the shopper, so offer it as a swap rather than silently dropping it.
    if (direct) {
      return {
        ...base,
        bucket: 'swap',
        reason: `Closest match for "${item.name}"`,
        matchedVariantId: direct.variantId,
        matchedName: direct.name,
        image: direct.image,
        price: direct.price,
        confidence: direct.confidence,
      };
    }

    return {
      ...base,
      bucket: 'not_on_tokri',
      reason: 'Not sold on Tokri yet',
      matchedVariantId: null,
      matchedName: null,
      image: null,
      price: null,
      confidence: 0,
    };
  }

  private async findBestVariant(
    name: string,
    storeId: string,
  ): Promise<{ variantId: string; name: string; image: string | null; price: number; confidence: number } | null> {
    const term = name.trim();
    if (!term) return null;

    const exact = await this.prisma.product.findFirst({
      where: {
        OR: [
          { name: { equals: term, mode: 'insensitive' } },
          { aliases: { has: term.toLowerCase() } },
          { hindiName: { equals: term, mode: 'insensitive' } },
        ],
      },
      include: { variants: { include: { inventory: { where: { storeId } } } } },
    });
    if (exact) {
      const variant = exact.variants.find((v) => (v.inventory[0]?.qtyAvailable ?? 0) > 0) ?? exact.variants[0];
      if (variant) {
        return {
          variantId: variant.id,
          name: `${exact.name} (${variant.size})`,
          image: exact.images[0] ?? null,
          price: variant.price,
          confidence: 0.95,
        };
      }
    }

    const contains = await this.prisma.product.findFirst({
      where: {
        OR: [{ name: { contains: term, mode: 'insensitive' } }, { aliases: { hasSome: [term.toLowerCase()] } }],
      },
      include: { variants: { include: { inventory: { where: { storeId } } } } },
    });
    if (contains) {
      const variant = contains.variants.find((v) => (v.inventory[0]?.qtyAvailable ?? 0) > 0) ?? contains.variants[0];
      if (variant) {
        return {
          variantId: variant.id,
          name: `${contains.name} (${variant.size})`,
          image: contains.images[0] ?? null,
          price: variant.price,
          confidence: 0.6,
        };
      }
    }

    const alias = await this.prisma.productAlias.findFirst({ where: { alias: { contains: term, mode: 'insensitive' } } });
    if (alias) {
      const product = await this.prisma.product.findFirst({
        where: { name: alias.canonical },
        include: { variants: { include: { inventory: { where: { storeId } } } } },
      });
      const variant = product?.variants.find((v) => (v.inventory[0]?.qtyAvailable ?? 0) > 0) ?? product?.variants[0];
      if (product && variant) {
        return {
          variantId: variant.id,
          name: `${product.name} (${variant.size})`,
          image: product.images[0] ?? null,
          price: variant.price,
          confidence: 0.82,
        };
      }
    }

    return null;
  }

  async *resolveKit(userId: string, prompt: string, storeId: string, servings?: number) {
    await this.checkRateLimit(userId);

    const normalizedKey = normalizeKey(prompt, servings ?? null);
    const cached = await this.prisma.kit.findFirst({ where: { normalizedKey }, orderBy: { createdAt: 'desc' } });

    const understood: UnderstoodKit = cached
      ? (cached.llmOutput as unknown as UnderstoodKit)
      : await this.understand(prompt, servings);

    const kit = await this.prisma.kit.create({
      data: {
        userId,
        prompt,
        goalType: understood.goalType,
        servings: understood.servings,
        normalizedKey,
        llmOutput: understood as any,
      },
    });

    const resolvedItems: ResolvedKitItem[] = [];
    for (const item of understood.items) {
      const resolved = await this.matchItem(item, storeId);
      resolvedItems.push(resolved);
      await this.prisma.kitItem.create({
        data: {
          kitId: kit.id,
          name: resolved.name,
          hindiAlias: resolved.hindiAlias,
          qty: resolved.qty,
          unit: resolved.unit,
          essential: resolved.essential,
          bucket: resolved.bucket,
          reason: resolved.reason,
          matchedVariantId: resolved.matchedVariantId,
          confidence: resolved.confidence,
        },
      });
      yield resolved;
    }

    return {
      id: kit.id,
      prompt,
      goalType: understood.goalType,
      servings: understood.servings,
      clarifyingQuestion: understood.clarifyingQuestion,
      safetyNote: understood.safetyNote,
      steps: understood.steps,
      items: resolvedItems,
    };
  }

  async getKit(kitId: string) {
    const kit = await this.prisma.kit.findUnique({ where: { id: kitId }, include: { items: true } });
    if (!kit) throw new NotFoundException('Kit not found');
    const understood = kit.llmOutput as unknown as UnderstoodKit;
    return {
      id: kit.id,
      prompt: kit.prompt,
      goalType: kit.goalType,
      servings: kit.servings,
      clarifyingQuestion: understood.clarifyingQuestion,
      safetyNote: understood.safetyNote,
      steps: understood.steps,
      items: kit.items,
    };
  }

  async addToCart(kitId: string, userId: string, cartId: string, onlyInStock = true) {
    const kit = await this.prisma.kit.findUnique({ where: { id: kitId }, include: { items: true } });
    if (!kit) throw new NotFoundException('Kit not found');

    const added: unknown[] = [];
    for (const item of kit.items) {
      if (!item.matchedVariantId) continue;
      if (onlyInStock && item.bucket !== 'in_stock' && item.bucket !== 'swap') continue;
      // Kit item qty is in recipe units (g, tsp, inch...), not "number of packs" — the matched
      // variant is a fixed pack size, so always add 1 pack and let the shopper adjust in-cart.
      const qty = 1;
      const { item: cartItem } = await this.cartService.addItem(cartId, userId, item.matchedVariantId, qty);
      added.push(cartItem);
    }
    await this.prisma.kit.update({ where: { id: kitId }, data: { cartId } });
    return { added: added.length };
  }

  async feedback(kitId: string, userId: string, correction: string) {
    const kit = await this.prisma.kit.findUnique({ where: { id: kitId } });
    if (!kit) throw new NotFoundException('Kit not found');
    // eslint-disable-next-line no-console
    console.log(`[kit-feedback] kit=${kitId} user=${userId} prompt="${kit.prompt}" correction="${correction}"`);
    return { ok: true };
  }
}
