'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { TabBar } from './tab-bar';
import { CartBar } from './cart-bar';

const TABBED_PREFIXES = ['/category', '/product', '/search', '/kit', '/cart', '/tokri'];

export function MobileAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showTabs = pathname === '/' || TABBED_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <div className="appframe">
      <div className="appbody">{children}</div>
      <CartBar />
      {showTabs && <TabBar />}
    </div>
  );
}
