'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'tokri-wishlist';

function read(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function useWishlist() {
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  useEffect(() => setIds(read()), []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { isWished: (id: string) => ids.has(id), toggle };
}
