import { NavLink } from 'react-router-dom';

interface Tab {
  to: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

function HomeIcon(active: boolean) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}
function LeaveIcon(active: boolean) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}
function ComplaintIcon(active: boolean) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v12H8l-4 4V4Z" />
      <path d="M12 8v4M12 15h.01" />
    </svg>
  );
}
function ProfileIcon(active: boolean) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </svg>
  );
}
function GridIcon(active: boolean) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}
function BedIcon(active: boolean) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18v2M21 18v2M3 12V7a1 1 0 0 1 1-1h5v6" />
    </svg>
  );
}
function BellIcon(active: boolean) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

const studentTabs: Tab[] = [
  { to: '/student', label: 'Home', icon: HomeIcon },
  { to: '/student/leave', label: 'Leave', icon: LeaveIcon },
  { to: '/student/complaints', label: 'Complaints', icon: ComplaintIcon },
  { to: '/student/profile', label: 'Profile', icon: ProfileIcon },
];

const adminTabs: Tab[] = [
  { to: '/admin', label: 'Dashboard', icon: GridIcon },
  { to: '/admin/rooms', label: 'Rooms', icon: BedIcon },
  { to: '/admin/notices', label: 'Notices', icon: BellIcon },
  { to: '/admin/profile', label: 'Settings', icon: ProfileIcon },
];

export default function BottomNav({ role }: { role: 'student' | 'admin' }) {
  const tabs = role === 'student' ? studentTabs : adminTabs;
  return (
    <nav
      className={[
        'fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)] z-30',
        // Admin swaps to the desktop sidebar at lg+; Student is unaffected and always shows the bottom nav.
        role === 'admin' ? 'lg:hidden' : '',
      ].join(' ')}
      aria-label="Primary"
    >
      <div className="mx-auto max-w-md flex">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/student' || tab.to === '/admin'}
            className="flex-1 flex flex-col items-center gap-1 py-2.5"
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-faint)]'}>
                  {tab.icon(isActive)}
                </span>
                <span
                  className={[
                    'text-[11px] font-medium',
                    isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-faint)]',
                  ].join(' ')}
                >
                  {tab.label}
                </span>
                <span
                  className="h-[3px] w-5 rounded-full mt-0.5"
                  style={{ background: isActive ? 'var(--color-accent)' : 'transparent' }}
                />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
