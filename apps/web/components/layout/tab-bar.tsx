'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Icon } from '../ui/icons';
import { useActiveCart } from '../../lib/hooks/use-active-cart';

export function TabBar() {
  const pathname = usePathname();
  const { cart } = useActiveCart();
  const count = cart?.items.reduce((sum, i) => sum + i.qty, 0) ?? 0;
  const tokriHref = cart?.type === 'shared' ? `/tokri/${cart.id}` : '/tokri/new';

  const TABS: { key: string; label: string; href: string; icon: 'home' | 'search' | 'kit' | 'tokri' | 'cart'; match: (p: string) => boolean }[] = [
    { key: 'home', label: 'Home', href: '/', icon: 'home', match: (p) => p === '/' },
    { key: 'search', label: 'Search', href: '/search', icon: 'search', match: (p) => p.startsWith('/search') },
    { key: 'kit', label: 'Kit', href: '/kit', icon: 'kit', match: (p) => p.startsWith('/kit') },
    { key: 'tokri', label: 'Tokri', href: tokriHref, icon: 'tokri', match: (p) => p.startsWith('/tokri') },
    { key: 'cart', label: 'Cart', href: '/cart', icon: 'cart', match: (p) => p.startsWith('/cart') },
  ];

  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((tab) => {
        const current = tab.match(pathname);
        return (
          <Link key={tab.key} href={tab.href} className={clsx(current && 'current')}>
            <Icon name={tab.icon} />
            {tab.label}
            {tab.key === 'cart' && count > 0 && <span className="tbadge">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
