import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'neutral' | 'brand' | 'teal' | 'accent' | 'success' | 'warning' | 'error' | 'ink';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  neutral: 'bg-canvas-100 text-ink-700 ring-1 ring-inset ring-ink-200',
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200',
  teal: 'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200',
  accent: 'bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-200',
  success: 'bg-success-50 text-success-700 ring-1 ring-inset ring-success-500/30',
  warning: 'bg-warning-50 text-warning-700 ring-1 ring-inset ring-warning-500/30',
  error: 'bg-error-50 text-error-700 ring-1 ring-inset ring-error-500/30',
  ink: 'bg-ink-900 text-white',
};

const sizes: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  children,
  className,
  leftIcon,
}: {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
  leftIcon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {leftIcon}
      {children}
    </span>
  );
}
