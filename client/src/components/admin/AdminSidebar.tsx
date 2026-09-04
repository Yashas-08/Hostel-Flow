import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  icon: (active: boolean) => React.ReactNode;
}

function iconProps(active: boolean) {
  return { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: active ? 2.2 : 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
}

const items: NavItem[] = [
  {
    to: '/admin',
    label: 'Dashboard',
    end: true,
    icon: (a) => (
      <svg {...iconProps(a)}>
        <rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" />
      </svg>
    ),
  },
  {
    to: '/admin/students',
    label: 'Students',
    icon: (a) => (
      <svg {...iconProps(a)}>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M2.5 19c1.1-3 3.5-4.6 6.5-4.6s5.4 1.6 6.5 4.6" />
        <circle cx="17.5" cy="7.5" r="2.4" />
        <path d="M15.8 12.3c2.1.4 3.7 1.8 4.5 4" />
      </svg>
    ),
  },
  {
    to: '/admin/rooms',
    label: 'Rooms',
    icon: (a) => (
      <svg {...iconProps(a)}>
        <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18v2M21 18v2M3 12V7a1 1 0 0 1 1-1h5v6" />
      </svg>
    ),
  },
  {
    to: '/admin/leaves',
    label: 'Leaves',
    icon: (a) => (
      <svg {...iconProps(a)}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    ),
  },
  {
    to: '/admin/complaints',
    label: 'Complaints',
    icon: (a) => (
      <svg {...iconProps(a)}>
        <path d="M4 4h16v12H8l-4 4V4Z" />
        <path d="M12 8v4M12 15h.01" />
      </svg>
    ),
  },
  {
    to: '/admin/notices',
    label: 'Notices',
    icon: (a) => (
      <svg {...iconProps(a)}>
        <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
    ),
  },
  {
    to: '/admin/scanners',
    label: 'Scanners',
    icon: (a) => (
      <svg {...iconProps(a)}>
        <path d="M4 8V5a1 1 0 0 1 1-1h3M4 16v3a1 1 0 0 0 1 1h3M20 8V5a1 1 0 0 0-1-1h-3M20 16v3a1 1 0 0 1-1 1h-3" />
        <path d="M4 12h16" />
      </svg>
    ),
  },
  {
    to: '/admin/profile',
    label: 'Settings',
    icon: (a) => (
      <svg {...iconProps(a)}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M4.5 20c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
      </svg>
    ),
  },
];

export default function AdminSidebar() {
  const { logout } = useAuth();
  return (
    <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-screen border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
            </svg>
          </div>
          <span className="font-display font-extrabold text-[18px] text-[var(--color-ink)]">Hostel Flow</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1" aria-label="Admin navigation">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                  : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-ink)]',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-faint)]'}>
                  {item.icon(isActive)}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--color-border)]">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-danger)] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          Log out
        </button>
      </div>
    </aside>
  );
}
