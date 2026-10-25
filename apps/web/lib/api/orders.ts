import { apiFetch } from './client';

export interface PaymentDto {
  id: string;
  payerId: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
}

export interface OrderSummaryDto {
  id: string;
  cartId: string;
  total: number;
  status: string;
  createdAt: string;
  cart: { items: { variant: { product: { name: string } } }[] };
}

export function listMyOrders() {
  return apiFetch<OrderSummaryDto[]>('/orders');
}

export function reorder(orderId: string, storeId: string) {
  return apiFetch<{ id: string }>(`/orders/${orderId}/reorder`, { method: 'POST', body: JSON.stringify({ storeId }) });
}

export function createOrder(cartId: string) {
  return apiFetch<{ order: { id: string }; payments: PaymentDto[] }>('/orders', { method: 'POST', body: JSON.stringify({ cartId }) });
}

export interface RazorpayOrderDto {
  mocked: boolean;
  razorpayOrderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
}

export function createRazorpayOrder(paymentId: string) {
  return apiFetch<RazorpayOrderDto>(`/payments/${paymentId}/razorpay-order`, { method: 'POST' });
}

export function verifyPayment(
  paymentId: string,
  body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
) {
  return apiFetch<{ status: 'paid' }>(`/payments/${paymentId}/verify`, { method: 'POST', body: JSON.stringify(body) });
}

export interface OrderDetailDto {
  id: string;
  cartId: string;
  storeId: string;
  userId: string;
  total: number;
  status: 'confirmed' | 'packing' | 'out_for_delivery' | 'delivered';
  riderName: string | null;
  eta: string | null;
  createdAt: string;
  payments: PaymentDto[];
  store: { name: string };
}

export function getOrder(orderId: string) {
  return apiFetch<OrderDetailDto>(`/orders/${orderId}`);
}
