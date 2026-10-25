'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'dark' : 'light');
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tokri-theme', next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle color theme"
      className="press-on-active flex h-10 w-10 items-center justify-center rounded-full bg-dust text-ink"
    >
      {theme === 'dark' ? '☀' : '●'}
    </button>
  );
}
