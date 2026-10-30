import { apiFetch } from './client';

export interface CouponDto {
  code: string;
  description: string | null;
  discountType: 'flat' | 'percent';
  value: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  expiresAt: string | null;
}

export function listActiveCoupons() {
  return apiFetch<CouponDto[]>('/coupons', { auth: false });
}
