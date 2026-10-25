'use client';

import posthog from 'posthog-js';

let initialized = false;

function ensureInit() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || initialized) return;
  posthog.init(key, { api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com' });
  initialized = true;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  ensureInit();
  posthog.capture(event, properties);
}
