'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuthStore } from '../../lib/store/auth';
import { MobileAppShell } from './mobile-app-shell';

export function RootShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const isLoggedOutLanding = pathname === '/' && !user;
  if (isLoggedOutLanding) return <>{children}</>;

  return <MobileAppShell>{children}</MobileAppShell>;
}
