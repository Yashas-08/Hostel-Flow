import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import { Card, StatusBadge } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import type { AdminDashboardSummary, AdminActivityItem } from '../../types';

function formatDateTime(d: string) {
  return new Date(d.replace(' ', 'T') + 'Z').toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">{label}</p>
      <p className="font-display font-bold text-2xl text-[var(--color-ink)] mt-1">{value}</p>
      {sub && <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{sub}</p>}
    </Card>
  );
}

const ACTIVITY_ICON: Record<AdminActivityItem['type'], React.ReactNode> = {
  leave: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  ),
  complaint: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v12H8l-4 4V4Z" /><path d="M12 8v4M12 15h.01" />
    </svg>
  ),
  attendance: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8V5a1 1 0 0 1 1-1h3M4 16v3a1 1 0 0 0 1 1h3M20 8V5a1 1 0 0 0-1-1h-3M20 16v3a1 1 0 0 1-1 1h-3" /><path d="M4 12h16" />
    </svg>
  ),
  notice: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10v4a1 1 0 0 0 1 1h2l4 4v-14l-4 4H4a1 1 0 0 0-1 1Z" /><path d="M15 8a4 4 0 0 1 0 8" />
    </svg>
  ),
};

function activityLine(item: AdminActivityItem): string {
  switch (item.type) {
    case 'leave':
      return `${item.studentName} applied for ${item.detail} leave`;
    case 'complaint':
      return `${item.studentName} raised "${item.detail}"`;
    case 'attendance':
      return `${item.studentName} checked in`;
    case 'notice':
      return item.status === 'published' ? `Notice published: ${item.detail}` : `Notice drafted: ${item.detail}`;
    default:
      return item.detail;
  }
}

function activityStatusKind(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (['approved', 'resolved', 'published', 'present'].includes(status)) return 'success';
  if (['pending', 'submitted', 'draft'].includes(status)) return 'warning';
  if (['rejected'].includes(status)) return 'danger';
  if (['in_progress'].includes(status)) return 'info';
  return 'neutral';
}

const QUICK_ACTIONS = [
  {
    label: 'Students',
    to: '/admin/students',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
      </svg>
    ),
  },
  {
    label: 'Rooms',
    to: '/admin/rooms',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18v2M21 18v2M3 12V7a1 1 0 0 1 1-1h5v6" />
      </svg>
    ),
  },
  {
    label: 'Leaves',
    to: '/admin/leaves',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    ),
  },
  {
    label: 'Complaints',
    to: '/admin/complaints',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v12H8l-4 4V4Z" /><path d="M12 8v4M12 15h.01" />
      </svg>
    ),
  },
  {
    label: 'Notices',
    to: '/admin/notices',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Z" /><path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
    ),
  },
  {
    label: 'Scanners',
    to: '/admin/scanners',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8V5a1 1 0 0 1 1-1h3M4 16v3a1 1 0 0 0 1 1h3M20 8V5a1 1 0 0 0-1-1h-3M20 16v3a1 1 0 0 1-1 1h-3" />
        <path d="M4 12h16" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    to: '/admin/profile',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    ),
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AdminDashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<AdminDashboardSummary>('/admin/dashboard'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <AdminHeader name={user?.fullName ?? ''} title="Dashboard" />
      <AdminScreen>
        {loading && <LoadingState label="Loading dashboard" />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && data && (
          <div className="space-y-5 mt-1 lg:space-y-6 lg:mt-0">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <StatTile label="Total students" value={String(data.totalStudents)} />
              <StatTile
                label="Occupied rooms"
                value={`${data.rooms.occupied}/${data.rooms.total}`}
              />
              <StatTile label="Pending leaves" value={String(data.pendingLeaves)} />
              <StatTile label="Pending complaints" value={String(data.pendingComplaints)} />
              <div className="col-span-2 lg:col-span-4">
                <StatTile
                  label="Today's attendance"
                  value={`${data.attendanceToday.present} / ${data.attendanceToday.totalStudents}`}
                  sub="students checked in today"
                />
              </div>
            </div>

            <div className="lg:hidden">
              <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-2.5">Quick actions</p>
              <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => navigate(action.to)}
                    className="flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-3.5 active:bg-[var(--color-primary-soft)] lg:hover:bg-[var(--color-primary-soft)] transition-colors"
                  >
                    <span className="text-[var(--color-primary)]">{action.icon}</span>
                    <span className="text-xs font-semibold text-[var(--color-ink)]">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-2.5">Recent activity</p>
              {data.recentActivity.length === 0 ? (
                <Card>
                  <p className="text-sm text-[var(--color-ink-muted)]">No recent activity</p>
                </Card>
              ) : (
                <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 xl:grid-cols-3">
                  {data.recentActivity.map((item) => (
                    <Card key={`${item.type}-${item.id}`} className="flex items-start gap-3 py-3">
                      <span className="text-[var(--color-ink-muted)] mt-0.5 shrink-0">{ACTIVITY_ICON[item.type]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[var(--color-ink)] leading-snug truncate">{activityLine(item)}</p>
                        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{formatDateTime(item.occurredAt)}</p>
                      </div>
                      <StatusBadge kind={activityStatusKind(item.status)}>
                        {item.status.replace('_', ' ')}
                      </StatusBadge>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminScreen>
    </>
  );
}
