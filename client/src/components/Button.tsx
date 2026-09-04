import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-[var(--color-primary)] text-[var(--color-primary-ink)] hover:opacity-90 active:opacity-80',
  secondary: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[var(--color-border)]',
  ghost: 'bg-transparent text-[var(--color-ink)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]',
  danger: 'bg-[var(--color-danger)] text-white hover:opacity-90',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  icon,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-semibold transition-colors',
        'disabled:opacity-50 disabled:pointer-events-none',
        size === 'md' ? 'h-12 px-5 text-[15px]' : 'h-9 px-3.5 text-sm',
        fullWidth ? 'w-full' : '',
        variantClasses[variant],
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
