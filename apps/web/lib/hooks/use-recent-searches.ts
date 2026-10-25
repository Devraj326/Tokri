'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'tokri-recent-searches';
const MAX = 6;

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function useRecentSearches() {
  const [terms, setTerms] = useState<string[]>([]);

  useEffect(() => setTerms(read()), []);

  const add = useCallback((term: string) => {
    const t = term.trim().toLowerCase();
    if (!t) return;
    setTerms((prev) => {
      const next = [t, ...prev.filter((x) => x !== t)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setTerms([]);
    localStorage.removeItem(KEY);
  }, []);

  return { terms, add, clear };
}
