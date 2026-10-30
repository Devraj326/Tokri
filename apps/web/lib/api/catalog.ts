import { apiFetch } from './client';

export interface NearestStoreResponse {
  serviceable: boolean;
  storeId: string | null;
  storeName: string | null;
  distanceKm?: number;
  etaMinutes: number | null;
}

export function nearestStore(lat: number, lng: number) {
  return apiFetch<NearestStoreResponse>(`/stores/nearest?lat=${lat}&lng=${lng}`, { auth: false });
}

export interface CategoryDto {
  id: string;
  name: string;
  hindiName: string | null;
  slug: string;
}

export function listCategories() {
  return apiFetch<CategoryDto[]>('/categories', { auth: false });
}

export interface VariantDto {
  id: string;
  size: string;
  mrp: number;
  price: number;
  qtyAvailable: number;
}

export interface ProductDto {
  id: string;
  name: string;
  hindiName: string | null;
  brand: string | null;
  unit: string;
  tileColor: string;
  isVeg: boolean | null;
  subcategory: string | null;
  category: { name: string; slug: string };
  variants: VariantDto[];
}

export interface ProductListResult {
  items: ProductDto[];
  total: number;
}

export function listProducts(
  storeId: string,
  categorySlug?: string,
  opts?: { subcategory?: string; limit?: number; offset?: number },
) {
  const q = new URLSearchParams({ store: storeId });
  if (categorySlug) q.set('category', categorySlug);
  if (opts?.subcategory) q.set('subcategory', opts.subcategory);
  if (opts?.limit != null) q.set('limit', String(opts.limit));
  if (opts?.offset != null) q.set('offset', String(opts.offset));
  return apiFetch<ProductListResult>(`/products?${q.toString()}`, { auth: false });
}

export interface ProductCounts {
  total: number;
  subcategories: Record<string, number>;
}

export function listProductCounts(storeId: string, categorySlug: string) {
  const q = new URLSearchParams({ store: storeId, category: categorySlug });
  return apiFetch<ProductCounts>(`/products/counts?${q.toString()}`, { auth: false });
}

export function getProduct(id: string, storeId: string) {
  return apiFetch<ProductDto>(`/products/${id}?store=${storeId}`, { auth: false });
}

export function searchProducts(q: string, storeId: string) {
  return apiFetch<ProductDto[]>(`/search?q=${encodeURIComponent(q)}&store=${storeId}`, { auth: false });
}
