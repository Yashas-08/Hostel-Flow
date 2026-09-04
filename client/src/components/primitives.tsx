import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Card({
  children,
  className = '',
  accentColor,
}: {
  children: ReactNode;
  className?: string;
  accentColor?: string;
}) {
  return (
    <div
      className={[
        'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 relative overflow-hidden',
        className,
      ].join(' ')}
    >
      {accentColor && (
        <span
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: accentColor }}
          aria-hidden
        />
      )}
      {children}
    </div>
  );
}

interface FieldWrapProps {
  label?: string;
  error?: string;
  children: ReactNode;
}

export function FieldWrap({ label, error, children }: FieldWrapProps) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">{label}</span>}
      {children}
      {error && <span className="block text-xs text-[var(--color-danger)] mt-1.5">{error}</span>}
    </label>
  );
}

const fieldBase =
  'w-full h-12 rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3.5 text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 transition-shadow';

export function Input({
  error,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <input
      className={[fieldBase, error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border-strong)]', className].join(' ')}
      {...rest}
    />
  );
}

export function Textarea({
  error,
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return (
    <textarea
      className={[
        fieldBase,
        'h-auto min-h-[96px] py-3 resize-none',
        error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border-strong)]',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}

export function Select({
  error,
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <select
      className={[fieldBase, error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border-strong)]', className].join(' ')}
      {...rest}
    >
      {children}
    </select>
  );
}

type StatusKind = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const statusStyles: Record<StatusKind, string> = {
  success: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
  info: 'bg-[var(--color-info-soft)] text-[var(--color-info)]',
  neutral: 'bg-[var(--color-primary-soft)] text-[var(--color-ink-muted)]',
};

export function StatusBadge({ kind, children }: { kind: StatusKind; children: ReactNode }) {
  return (
    <span className={['inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', statusStyles[kind]].join(' ')}>
      {children}
    </span>
  );
}

export function leaveStatusKind(status: string): StatusKind {
  switch (status) {
    case 'approved':
      return 'success';
    case 'pending':
      return 'warning';
    case 'rejected':
      return 'danger';
    case 'cancelled':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function noticePriorityKind(priority: string): StatusKind {
  switch (priority) {
    case 'urgent':
      return 'danger';
    case 'important':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function noticePriorityLabel(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'Urgent';
    case 'important':
      return 'Important';
    default:
      return 'Normal';
  }
}

export function complaintStatusKind(status: string): StatusKind {
  switch (status) {
    case 'resolved':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'rejected':
      return 'danger';
    case 'submitted':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function complaintStatusLabel(status: string): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export function Avatar({ name, size = 40, src }: { name: string; size?: number; src?: string | null }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-ink)] font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative h-7 w-12 rounded-full transition-colors shrink-0 disabled:opacity-50',
        checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border-strong)]',
      ].join(' ')}
    >
      <span
        className={[
          // Explicit left-0 anchors the knob's un-transformed position to the track's
          // left edge. Without it, an absolutely-positioned child of a <button> can
          // resolve its static position ambiguously (buttons get special internal
          // layout for centering their content), which was making the knob render in
          // the wrong spot even before translate-x was applied — the slide looked
          // broken/jumpy as a result. Verified via headless-browser screenshots.
          'absolute left-0 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}
