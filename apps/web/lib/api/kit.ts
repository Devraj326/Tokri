import { API_URL } from './client';
import { useAuthStore } from '../store/auth';

export interface KitItemDto {
  name: string;
  hindiAlias: string | null;
  qty: number;
  unit: string;
  essential: boolean;
  bucket: 'in_stock' | 'swap' | 'not_on_tokri' | 'probably_at_home';
  reason: string | null;
  matchedVariantId: string | null;
  matchedName: string | null;
  image: string | null;
  price: number | null;
  confidence: number;
}

export interface KitDoneDto {
  id: string;
  prompt: string;
  goalType: 'recipe' | 'repair' | 'project' | 'occasion' | 'household';
  servings: number | null;
  clarifyingQuestion: string | null;
  safetyNote: string | null;
  steps: string[] | null;
  items: KitItemDto[];
}

export async function streamKit(
  prompt: string,
  storeId: string,
  servings: number | undefined,
  onItem: (item: KitItemDto) => void,
  onDone: (result: KitDoneDto) => void,
  onError: (message: string) => void,
) {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${API_URL}/kits`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ prompt, storeId, servings }),
  });

  if (!res.body) {
    onError('No response stream');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const lines = part.split('\n');
      const eventLine = lines.find((l) => l.startsWith('event:'));
      const dataLine = lines.find((l) => l.startsWith('data:'));
      if (!eventLine || !dataLine) continue;
      const event = eventLine.replace('event:', '').trim();
      const data = JSON.parse(dataLine.replace('data:', '').trim());
      if (event === 'item') onItem(data as KitItemDto);
      else if (event === 'done') onDone(data as KitDoneDto);
      else if (event === 'error') onError(data.message);
    }
  }
}

export function addKitToCart(kitId: string, cartId: string) {
  const token = useAuthStore.getState().accessToken;
  return fetch(`${API_URL}/kits/${kitId}/add-to-cart`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ cartId }),
  }).then((r) => r.json());
}

export function sendKitFeedback(kitId: string, correction: string) {
  const token = useAuthStore.getState().accessToken;
  return fetch(`${API_URL}/kits/${kitId}/feedback`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ correction }),
  }).then((r) => r.json());
}
