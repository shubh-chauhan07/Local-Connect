import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'subtle' | 'white';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm disabled:bg-brand-300',
  secondary:
    'bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-700 shadow-sm disabled:bg-ink-400',
  outline:
    'border border-ink-300 bg-white text-ink-800 hover:bg-canvas-100 hover:border-ink-400 disabled:opacity-50',
  ghost: 'text-ink-700 hover:bg-canvas-100 disabled:opacity-50',
  danger:
    'bg-error-500 text-white hover:bg-error-600 active:bg-error-700 shadow-sm disabled:bg-error-300',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-50',
  white:
    'bg-white text-brand-700 hover:bg-brand-50 active:bg-brand-100 shadow-sm font-semibold disabled:bg-white/60 disabled:text-brand-300',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading,
  fullWidth,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-colors duration-150 disabled:cursor-not-allowed select-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
