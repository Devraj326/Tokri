import { apiFetch } from './client';

export interface ReviewDto {
  id: string;
  rating: number;
  text: string | null;
  createdAt: string;
  userName: string;
}

export interface ProductReviewsDto {
  average: number;
  count: number;
  reviews: ReviewDto[];
}

export function listProductReviews(productId: string) {
  return apiFetch<ProductReviewsDto>(`/products/${productId}/reviews`, { auth: false });
}

export function submitReview(productId: string, data: { rating: number; text?: string; orderId?: string }) {
  return apiFetch(`/products/${productId}/reviews`, { method: 'POST', body: JSON.stringify(data) });
}
