'use client';

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
}

interface RazorpayCheckout {
  open(): void;
  on(event: 'payment.failed', handler: (response: { error: { description: string } }) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckout;
  }
}

let loadPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Razorpay can only load in the browser'));
  if (window.Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Could not load the Razorpay checkout script'));
    };
    document.body.appendChild(script);
  });
  return loadPromise;
}

export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error('Razorpay checkout failed to load');

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      ...options,
      handler: async (response) => {
        try {
          await options.handler(response);
          resolve();
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Payment verification failed'));
        }
      },
      modal: {
        ondismiss: () => {
          options.modal?.ondismiss?.();
          reject(new Error('Payment cancelled'));
        },
      },
    });
    rzp.on('payment.failed', (response) => {
      reject(new Error(response.error?.description ?? 'Payment failed'));
    });
    rzp.open();
  });
}
