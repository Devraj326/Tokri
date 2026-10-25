'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'tokri-kit-history';
const MAX = 5;

export interface KitHistoryEntry {
  prompt: string;
  itemCount: number;
}

function read(): KitHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function useKitHistory() {
  const [history, setHistory] = useState<KitHistoryEntry[]>([]);

  useEffect(() => setHistory(read()), []);

  const add = useCallback((entry: KitHistoryEntry) => {
    setHistory((prev) => {
      const next = [entry, ...prev.filter((h) => h.prompt !== entry.prompt)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { history, add };
}
