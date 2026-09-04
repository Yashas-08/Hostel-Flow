import type { ReactNode } from 'react';
import Button from './Button';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--color-ink-muted)]">
      <span className="h-6 w-6 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 gap-2">
      {icon && <div className="text-[var(--color-ink-faint)] mb-1">{icon}</div>}
      <p className="font-display font-semibold text-[var(--color-ink)]">{title}</p>
      {description && <p className="text-sm text-[var(--color-ink-muted)] max-w-xs">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 gap-3">
      <p className="font-display font-semibold text-[var(--color-danger)]">Something went wrong</p>
      <p className="text-sm text-[var(--color-ink-muted)] max-w-xs">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
