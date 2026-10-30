import { apiFetch } from './client';

function qs(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function adminMe() {
  return apiFetch<{ isAdmin: boolean }>('/admin/me');
}

export interface AdminStats {
  users: number;
  products: number;
  categories: number;
  stores: number;
  orders: number;
  revenueTotal: number;
  ordersByStatus: Record<string, number>;
  coupons: number;
  reviews: number;
  avgRating: number;
}

export function adminStats() {
  return apiFetch<AdminStats>('/admin/stats');
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  _count: { orders: number; hostedCarts: number };
}

export function adminListUsers(params: { search?: string; limit?: number; offset?: number }) {
  return apiFetch<{ items: AdminUser[]; total: number }>(`/admin/users${qs(params)}`);
}

export function adminGetUser(id: string) {
  return apiFetch(`/admin/users/${id}`);
}

export function adminUpdateUser(id: string, data: { name?: string; email?: string; phone?: string }) {
  return apiFetch(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function adminDeleteUser(id: string) {
  return apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
}

export interface AdminVariant {
  id: string;
  size: string;
  mrp: number;
  price: number;
  inventory: { storeId: string; qtyAvailable: number; qtyReserved: number }[];
}

export interface AdminProduct {
  id: string;
  name: string;
  hindiName: string | null;
  brand: string | null;
  unit: string;
  tileColor: string;
  isVeg: boolean | null;
  subcategory: string | null;
  aliases: string[];
  category: { id: string; name: string; slug: string };
  variants: AdminVariant[];
}

export function adminListProducts(params: { search?: string; category?: string; limit?: number; offset?: number }) {
  return apiFetch<{ items: AdminProduct[]; total: number }>(`/admin/products${qs(params)}`);
}

export function adminGetProduct(id: string) {
  return apiFetch<AdminProduct>(`/admin/products/${id}`);
}

export function adminCreateProduct(data: {
  name: string;
  hindiName?: string;
  categoryId: string;
  subcategory?: string;
  brand?: string;
  unit: string;
  tileColor?: string;
  isVeg?: boolean;
}) {
  return apiFetch<AdminProduct>('/admin/products', { method: 'POST', body: JSON.stringify(data) });
}

export function adminUpdateProduct(id: string, data: Partial<AdminProduct>) {
  return apiFetch<AdminProduct>(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function adminDeleteProduct(id: string) {
  return apiFetch(`/admin/products/${id}`, { method: 'DELETE' });
}

export function adminCreateVariant(productId: string, data: { size: string; mrp: number; price: number }) {
  return apiFetch(`/admin/products/${productId}/variants`, { method: 'POST', body: JSON.stringify(data) });
}

export function adminUpdateVariant(id: string, data: { size?: string; mrp?: number; price?: number }) {
  return apiFetch(`/admin/variants/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function adminDeleteVariant(id: string) {
  return apiFetch(`/admin/variants/${id}`, { method: 'DELETE' });
}

export function adminUpsertInventory(variantId: string, storeId: string, qtyAvailable: number) {
  return apiFetch(`/admin/variants/${variantId}/inventory`, {
    method: 'PATCH',
    body: JSON.stringify({ storeId, qtyAvailable }),
  });
}

export interface AdminCategory {
  id: string;
  name: string;
  hindiName: string | null;
  slug: string;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  _count: { products: number };
}

export function adminListCategories() {
  return apiFetch<AdminCategory[]>('/admin/categories');
}

export function adminCreateCategory(data: { name: string; hindiName?: string; slug: string; parentId?: string }) {
  return apiFetch<AdminCategory>('/admin/categories', { method: 'POST', body: JSON.stringify(data) });
}

export function adminUpdateCategory(
  id: string,
  data: { name?: string; hindiName?: string; slug?: string; parentId?: string },
) {
  return apiFetch<AdminCategory>(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function adminDeleteCategory(id: string) {
  return apiFetch(`/admin/categories/${id}`, { method: 'DELETE' });
}

export interface AdminOrder {
  id: string;
  total: number;
  status: string;
  riderName: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
  store: { id: string; name: string };
  payments: { id: string; amount: number; status: string }[];
}

export function adminListOrders(params: { status?: string; limit?: number; offset?: number }) {
  return apiFetch<{ items: AdminOrder[]; total: number }>(`/admin/orders${qs(params)}`);
}

export function adminGetOrder(id: string) {
  return apiFetch(`/admin/orders/${id}`);
}

export function adminUpdateOrderStatus(id: string, status: string) {
  return apiFetch(`/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export interface AdminStore {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  isOpen: boolean;
}

export function adminListStores() {
  return apiFetch<AdminStore[]>('/admin/stores');
}

export function adminCreateStore(data: { name: string; lat: number; lng: number; radiusKm?: number; isOpen?: boolean }) {
  return apiFetch<AdminStore>('/admin/stores', { method: 'POST', body: JSON.stringify(data) });
}

export function adminUpdateStore(
  id: string,
  data: { name?: string; lat?: number; lng?: number; radiusKm?: number; isOpen?: boolean },
) {
  return apiFetch<AdminStore>(`/admin/stores/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function adminDeleteStore(id: string) {
  return apiFetch(`/admin/stores/${id}`, { method: 'DELETE' });
}

export interface AdminCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'flat' | 'percent';
  value: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  isActive: boolean;
  expiresAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  createdAt: string;
}

export function adminListCoupons() {
  return apiFetch<AdminCoupon[]>('/admin/coupons');
}

export function adminCreateCoupon(data: {
  code: string;
  description?: string;
  discountType: 'flat' | 'percent';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  expiresAt?: string;
  usageLimit?: number;
}) {
  return apiFetch<AdminCoupon>('/admin/coupons', { method: 'POST', body: JSON.stringify(data) });
}

export function adminUpdateCoupon(
  id: string,
  data: Partial<{
    description: string;
    discountType: 'flat' | 'percent';
    value: number;
    minOrderValue: number;
    maxDiscount: number;
    isActive: boolean;
    expiresAt: string;
    usageLimit: number;
  }>,
) {
  return apiFetch<AdminCoupon>(`/admin/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function adminDeleteCoupon(id: string) {
  return apiFetch(`/admin/coupons/${id}`, { method: 'DELETE' });
}

export interface AdminReview {
  id: string;
  rating: number;
  text: string | null;
  createdAt: string;
  product: { id: string; name: string };
  user: { id: string; name: string | null; email: string | null };
}

export function adminListReviews(params: { limit?: number; offset?: number }) {
  return apiFetch<{ items: AdminReview[]; total: number }>(`/admin/reviews${qs(params)}`);
}

export function adminDeleteReview(id: string) {
  return apiFetch(`/admin/reviews/${id}`, { method: 'DELETE' });
}
