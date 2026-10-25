import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

const VARIANTS = {
  primary: 'primary',
  secondary: '',
  danger: 'ink-fill',
  ghost: 'ghost',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <button className={clsx('btn', VARIANTS[variant], className)} {...props}>
      {children}
    </button>
  );
}
