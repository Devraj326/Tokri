'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'tokri-requested-items';

function read(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function useRequestedItems() {
  const [terms, setTerms] = useState<Set<string>>(new Set());

  useEffect(() => setTerms(read()), []);

  const request = useCallback((term: string) => {
    const t = term.trim().toLowerCase();
    if (!t) return;
    setTerms((prev) => {
      const next = new Set(prev);
      next.add(t);
      localStorage.setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { isRequested: (term: string) => terms.has(term.trim().toLowerCase()), request };
}
