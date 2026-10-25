import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export function Stamp({
  children,
  color = 'mirchi',
  className,
}: {
  children: ReactNode;
  color?: 'mirchi' | 'methi';
  className?: string;
}) {
  return <span className={clsx('stamp', color === 'methi' && 'green', className)}>{children}</span>;
}
