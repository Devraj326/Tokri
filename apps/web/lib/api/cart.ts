import { apiFetch } from './client';

export interface CartItemDto {
  id: string;
  cartId: string;
  variantId: string;
  productId: string;
  name: string;
  image: string | null;
  price: number;
  mrp: number;
  qty: number;
  addedBy: string;
  note: string | null;
  source: 'manual' | 'kit';
  inStock: boolean;
  createdAt: string;
  categorySlug: string;
  subcategory: string | null;
  reactions: { userId: string; value: 'up' | 'down' }[];
}

export interface CartMemberDto {
  userId: string;
  name: string;
  role: 'host' | 'member' | 'viewer';
  color: string;
  isDone: boolean;
  joinedAt: string;
}

export interface CartStateDto {
  id: string;
  type: 'solo' | 'shared';
  name: string | null;
  hostId: string;
  storeId: string;
  addressId: string | null;
  status: 'open' | 'locked' | 'ordered' | 'expired';
  orderId: string | null;
  couponCode: string | null;
  budgetCap: number | null;
  splitMode: 'host_pays_all' | 'pay_for_own' | 'split_equally' | 'custom';
  inviteCode: string | null;
  version: number;
  members: CartMemberDto[];
  items: CartItemDto[];
}

export interface BillDto {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  couponCode: string | null;
  total: number;
  freeDeliveryThreshold: number;
  amountToFreeDelivery: number;
}

export function createSoloCart(storeId: string) {
  return apiFetch<CartStateDto>('/carts', { method: 'POST', body: JSON.stringify({ storeId }) });
}

export function createSharedCart(storeId: string, name: string) {
  return apiFetch<CartStateDto>('/carts/shared', { method: 'POST', body: JSON.stringify({ storeId, name }) });
}

export function joinSharedCart(inviteCode: string) {
  return apiFetch<CartStateDto>(`/carts/join/${inviteCode}`, { method: 'POST' });
}

export function getCart(cartId: string) {
  return apiFetch<CartStateDto>(`/carts/${cartId}`);
}

export function getBill(cartId: string) {
  return apiFetch<BillDto>(`/carts/${cartId}/bill`);
}

export function addCartItem(cartId: string, variantId: string, qty: number, note?: string) {
  return apiFetch<CartItemDto>(`/carts/${cartId}/items`, { method: 'POST', body: JSON.stringify({ variantId, qty, note }) });
}

export function updateCartItem(cartId: string, itemId: string, qty: number) {
  return apiFetch<CartItemDto>(`/carts/${cartId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ qty }) });
}

export function removeCartItem(cartId: string, itemId: string) {
  return apiFetch<{ ok: boolean }>(`/carts/${cartId}/items/${itemId}`, { method: 'DELETE' });
}

export function lockCart(cartId: string) {
  return apiFetch<{ locked: boolean; holdExpiresInMinutes: number }>(`/carts/${cartId}/lock`, { method: 'POST' });
}

export function setBudgetCap(cartId: string, budgetCap: number | null) {
  return apiFetch(`/carts/${cartId}/budget`, { method: 'POST', body: JSON.stringify({ budgetCap }) });
}

export function setSplitMode(cartId: string, splitMode: CartStateDto['splitMode']) {
  return apiFetch(`/carts/${cartId}/split`, { method: 'POST', body: JSON.stringify({ splitMode }) });
}

export interface ShareDto {
  userId: string;
  amount: number;
}

export function getShares(cartId: string) {
  return apiFetch<ShareDto[]>(`/carts/${cartId}/shares`);
}

export function transferHost(cartId: string, newHostId: string) {
  return apiFetch(`/carts/${cartId}/transfer-host`, { method: 'POST', body: JSON.stringify({ newHostId }) });
}

export function removeMember(cartId: string, userId: string) {
  return apiFetch(`/carts/${cartId}/members/${userId}`, { method: 'DELETE' });
}

export function applyCoupon(cartId: string, code: string) {
  return apiFetch<{ version: number }>(`/carts/${cartId}/coupon`, { method: 'POST', body: JSON.stringify({ code }) });
}

export function removeCoupon(cartId: string) {
  return apiFetch<{ version: number }>(`/carts/${cartId}/coupon`, { method: 'DELETE' });
}
