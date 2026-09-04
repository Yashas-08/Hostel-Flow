import { Card, StatusBadge } from './primitives';
import type { DashboardSummary } from '../types';

const attendanceLabel: Record<DashboardSummary['attendanceStatus'], { text: string; kind: 'success' | 'warning' | 'neutral' }> = {
  present: { text: 'Checked in today', kind: 'success' },
  absent: { text: 'Marked absent today', kind: 'warning' },
  on_leave: { text: 'On approved leave', kind: 'neutral' },
  not_checked_in: { text: 'Not checked in yet', kind: 'warning' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function StatusSection({ summary }: { summary: DashboardSummary }) {
  const attendance = attendanceLabel[summary.attendanceStatus];

  return (
    <Card>
      <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">Today</p>
      <div className="flex items-center justify-between py-1.5">
        <span className="text-sm text-[var(--color-ink)]">Attendance status</span>
        <StatusBadge kind={attendance.kind}>{attendance.text}</StatusBadge>
      </div>

      {summary.pendingLeave && (
        <div className="flex items-center justify-between py-1.5 border-t border-[var(--color-border)] mt-1.5 pt-2.5">
          <span className="text-sm text-[var(--color-ink)]">
            {summary.pendingLeave.leaveType} leave · {formatDate(summary.pendingLeave.startDate)}–{formatDate(summary.pendingLeave.endDate)}
          </span>
          <StatusBadge kind="warning">Pending</StatusBadge>
        </div>
      )}

      {summary.upcomingLeave && (
        <div className="flex items-center justify-between py-1.5 border-t border-[var(--color-border)] mt-1.5 pt-2.5">
          <span className="text-sm text-[var(--color-ink)]">
            Upcoming: {summary.upcomingLeave.leaveType} from {formatDate(summary.upcomingLeave.startDate)}
          </span>
          <StatusBadge kind="success">Approved</StatusBadge>
        </div>
      )}
    </Card>
  );
}
