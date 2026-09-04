import { Avatar } from '../primitives';

function BellIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export default function AdminHeader({
  name,
  title,
  onNotificationClick,
}: {
  name: string;
  /** Section title shown only in the compact desktop top bar, e.g. "Students". */
  title?: string;
  onNotificationClick?: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 bg-[var(--color-bg)]/95 backdrop-blur-sm">
      {/* Mobile / tablet: identical to the shared Header used across the app */}
      <div className="lg:hidden pt-[calc(env(safe-area-inset-top)+14px)] pb-3 px-4">
        <div className="mx-auto max-w-md flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={name} size={42} />
            <div className="min-w-0">
              <p className="font-display font-bold text-[17px] leading-tight text-[var(--color-ink)] truncate">{name}</p>
              <p className="text-xs text-[var(--color-ink-muted)] truncate">Admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNotificationClick}
            aria-label="Notifications"
            className="h-10 w-10 flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shrink-0"
          >
            <BellIcon />
          </button>
        </div>
      </div>

      {/* Desktop: compact top bar, aligned with the sidebar + wide content column */}
      <div className="hidden lg:block border-b border-[var(--color-border)]">
        <div className="mx-auto w-full max-w-6xl px-8 h-16 flex items-center justify-between">
          <h1 className="font-display font-bold text-[20px] text-[var(--color-ink)] truncate min-w-0">
            {title ?? 'Admin'}
          </h1>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onNotificationClick}
              aria-label="Notifications"
              className="h-10 w-10 flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-primary-soft)] transition-colors"
            >
              <BellIcon />
            </button>
            <div className="flex items-center gap-2.5 min-w-0 pl-1">
              <Avatar name={name} size={34} />
              <span className="font-medium text-sm text-[var(--color-ink)] truncate max-w-[160px]">{name}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
