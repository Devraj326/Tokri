'use client';

import { useEffect, useState } from 'react';

export function useLowMotion(): boolean {
  const [low, setLow] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowEndDevice = (navigator.hardwareConcurrency ?? 8) < 4;
    setLow(prefersReduced || lowEndDevice);
  }, []);

  return low;
}
