'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Icon } from '../ui/icons';

export function AppBar({ title, backHref, right, fade, className }: { title: ReactNode; backHref?: string; right?: ReactNode; fade?: boolean; className?: string }) {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!fade) return;
    const onScroll = () => setShow(window.scrollY > 120);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [fade]);

  return (
    <header className={clsx('appbar', fade && 'fade', show && 'show', className)}>
      <button
        className="iconbtn"
        aria-label="Back"
        onClick={() => (backHref ? router.push(backHref) : router.back())}
      >
        <Icon name="back" />
      </button>
      <h1>{title}</h1>
      {right}
    </header>
  );
}
