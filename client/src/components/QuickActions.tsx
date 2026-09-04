import { useNavigate } from 'react-router-dom';

interface Action {
  label: string;
  to: string;
  icon: React.ReactNode;
}

function CalendarPlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18M12 14v5M9.5 16.5h5" />
    </svg>
  );
}
function MealIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3v6a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M9 11v10M17 3c-1.5 1.5-2 3-2 5s.5 3 2 3 2-1 2-3-.5-3.5-2-5Z" />
      <path d="M17 11v10" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3v18M5 4h11l-2 3.5L16 11H5" />
    </svg>
  );
}
function MegaphoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10v4a1 1 0 0 0 1 1h2l4 4v-14l-4 4H4a1 1 0 0 0-1 1Z" />
      <path d="M15 8a4 4 0 0 1 0 8M18 5a8 8 0 0 1 0 14" />
    </svg>
  );
}

const actions: Action[] = [
  { label: 'Apply Leave', to: '/student/leave/new', icon: <CalendarPlusIcon /> },
  { label: 'Book a Meal', to: '/student/meals', icon: <MealIcon /> },
  { label: 'Raise Complaint', to: '/student/complaints/new', icon: <FlagIcon /> },
  { label: 'View Notices', to: '/student/notices', icon: <MegaphoneIcon /> },
];

export default function QuickActions() {
  const navigate = useNavigate();
  return (
    <div>
      <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-2.5">Quick actions</p>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => navigate(action.to)}
            className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3.5 text-left active:bg-[var(--color-primary-soft)] transition-colors"
          >
            <span className="text-[var(--color-primary)]">{action.icon}</span>
            <span className="text-sm font-semibold text-[var(--color-ink)] leading-tight">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
