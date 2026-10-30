'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/store/auth';
import { adminMe } from '../../lib/api/admin';
import './admin.css';

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/stores', label: 'Stores' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/reviews', label: 'Reviews' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);

  const meQuery = useQuery({
    queryKey: ['admin-me'],
    queryFn: adminMe,
    enabled: !!accessToken,
    retry: false,
  });

  if (!accessToken) {
    return (
      <div className="admin-shell">
        <div className="admin-main">
          <h2>Admin</h2>
          <p>
            <Link href="/login" style={{ color: 'var(--mirchi)', textDecoration: 'underline' }}>
              Log in
            </Link>{' '}
            with an admin account first.
          </p>
        </div>
      </div>
    );
  }

  if (meQuery.isLoading) {
    return (
      <div className="admin-shell">
        <div className="admin-main">
          <p>Checking access…</p>
        </div>
      </div>
    );
  }

  if (meQuery.isError || !meQuery.data?.isAdmin) {
    return (
      <div className="admin-shell">
        <div className="admin-main">
          <h2>Not authorized</h2>
          <p style={{ color: 'var(--muted)' }}>This account doesn't have admin access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <h1>Tokri Admin</h1>
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="admin-main">{children}</div>
    </div>
  );
}
