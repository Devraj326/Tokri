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

export function listProducts(storeId: string, categorySlug?: string) {
  const q = new URLSearchParams({ store: storeId });
  if (categorySlug) q.set('category', categorySlug);
  return apiFetch<ProductDto[]>(`/products?${q.toString()}`, { auth: false });
}

export function getProduct(id: string, storeId: string) {
  return apiFetch<ProductDto>(`/products/${id}?store=${storeId}`, { auth: false });
}

export function searchProducts(q: string, storeId: string) {
  return apiFetch<ProductDto[]>(`/search?q=${encodeURIComponent(q)}&store=${storeId}`, { auth: false });
}
