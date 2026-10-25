import { z } from 'zod';

// ---------- Enums ----------

export const CartType = z.enum(['solo', 'shared']);
export type CartType = z.infer<typeof CartType>;

export const CartStatus = z.enum(['open', 'locked', 'ordered', 'expired']);
export type CartStatus = z.infer<typeof CartStatus>;

export const CartMemberRole = z.enum(['host', 'member', 'viewer']);
export type CartMemberRole = z.infer<typeof CartMemberRole>;

export const SplitMode = z.enum(['host_pays_all', 'pay_for_own', 'split_equally', 'custom']);
export type SplitMode = z.infer<typeof SplitMode>;

export const CartItemSource = z.enum(['manual', 'kit']);
export type CartItemSource = z.infer<typeof CartItemSource>;

export const KitGoalType = z.enum(['recipe', 'repair', 'project', 'occasion', 'household']);
export type KitGoalType = z.infer<typeof KitGoalType>;

export const KitItemBucket = z.enum(['in_stock', 'swap', 'not_on_tokri', 'probably_at_home']);
export type KitItemBucket = z.infer<typeof KitItemBucket>;

export const OrderStatus = z.enum(['confirmed', 'packing', 'out_for_delivery', 'delivered']);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const PaymentStatus = z.enum(['pending', 'paid', 'failed']);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

// ---------- Cart domain ----------

export const CartMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  role: CartMemberRole,
  color: z.string(),
  isDone: z.boolean(),
  joinedAt: z.string(),
});
export type CartMember = z.infer<typeof CartMemberSchema>;

export const CartItemReactionSchema = z.object({
  userId: z.string(),
  value: z.enum(['up', 'down']),
});
export type CartItemReaction = z.infer<typeof CartItemReactionSchema>;

export const CartItemSchema = z.object({
  id: z.string(),
  cartId: z.string(),
  variantId: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  price: z.number(),
  qty: z.number().int().positive(),
  addedBy: z.string(),
  note: z.string().nullable(),
  source: CartItemSource,
  inStock: z.boolean(),
  reactions: z.array(CartItemReactionSchema).default([]),
});
export type CartItem = z.infer<typeof CartItemSchema>;

export const CartStateSchema = z.object({
  id: z.string(),
  type: CartType,
  name: z.string().nullable(),
  hostId: z.string(),
  storeId: z.string(),
  addressId: z.string().nullable(),
  status: CartStatus,
  budgetCap: z.number().nullable(),
  splitMode: SplitMode,
  inviteCode: z.string().nullable(),
  version: z.number().int(),
  members: z.array(CartMemberSchema),
  items: z.array(CartItemSchema),
});
export type CartState = z.infer<typeof CartStateSchema>;

// ---------- Socket.IO event payloads ----------
// room = cart:{id}

export const ClientToServerEvents = {
  'cart:join': z.object({ cartId: z.string() }),
  'item:add': z.object({ cartId: z.string(), variantId: z.string(), qty: z.number().int().positive(), note: z.string().optional() }),
  'item:update': z.object({ cartId: z.string(), itemId: z.string(), qty: z.number().int().positive() }),
  'item:remove': z.object({ cartId: z.string(), itemId: z.string() }),
  'item:react': z.object({ cartId: z.string(), itemId: z.string(), value: z.enum(['up', 'down']) }),
  'member:done': z.object({ cartId: z.string(), isDone: z.boolean() }),
  'presence:ping': z.object({ cartId: z.string() }),
};

export const ServerToClientEvents = {
  'cart:state': CartStateSchema,
  'item:added': z.object({ cartId: z.string(), item: CartItemSchema, version: z.number().int() }),
  'item:updated': z.object({ cartId: z.string(), item: CartItemSchema, version: z.number().int() }),
  'item:removed': z.object({ cartId: z.string(), itemId: z.string(), version: z.number().int() }),
  'member:joined': z.object({ cartId: z.string(), member: CartMemberSchema, version: z.number().int() }),
  'member:left': z.object({ cartId: z.string(), userId: z.string(), version: z.number().int() }),
  'cart:locked': z.object({ cartId: z.string(), version: z.number().int() }),
  'split:updated': z.object({ cartId: z.string(), splitMode: SplitMode, shares: z.array(z.object({ userId: z.string(), amount: z.number() })), version: z.number().int() }),
  'payment:status': z.object({ cartId: z.string(), userId: z.string(), status: PaymentStatus }),
  'order:status': z.object({ orderId: z.string(), status: OrderStatus, eta: z.string().nullable() }),
};

// ---------- AI Kit ----------

export const KitItemSchema = z.object({
  name: z.string(),
  hindiAlias: z.string().nullable(),
  qty: z.number(),
  unit: z.string(),
  essential: z.boolean(),
  bucket: KitItemBucket,
  reason: z.string().nullable(),
  matchedVariantId: z.string().nullable(),
  matchedName: z.string().nullable(),
  image: z.string().nullable(),
  price: z.number().nullable(),
  confidence: z.number().min(0).max(1),
});
export type KitItem = z.infer<typeof KitItemSchema>;

export const KitResultSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  goalType: KitGoalType,
  servings: z.number().nullable(),
  clarifyingQuestion: z.string().nullable(),
  safetyNote: z.string().nullable(),
  items: z.array(KitItemSchema),
});
export type KitResult = z.infer<typeof KitResultSchema>;
