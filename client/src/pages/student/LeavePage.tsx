import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import Screen from '../../components/Screen';
import { Card, StatusBadge, leaveStatusKind } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import Button from '../../components/Button';
import type { LeaveRequest } from '../../types';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function LeavePage() {
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState<LeaveRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setLeaves(await api.get<LeaveRequest[]>('/leaves'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your leave history.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Screen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-4 flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl text-[var(--color-ink)]">Leave</h1>
        <Button size="sm" onClick={() => navigate('/student/leave/new')}>
          Apply
        </Button>
      </div>

      {loading && <LoadingState label="Loading leave requests" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && leaves && (
        leaves.length === 0 ? (
          <EmptyState
            title="No leave requests yet"
            description="Applied leaves and their status will show up here."
            action={<Button size="sm" onClick={() => navigate('/student/leave/new')}>Apply for leave</Button>}
          />
        ) : (
          <div className="space-y-2.5">
            {leaves.map((leave) => (
              <button key={leave.id} type="button" onClick={() => navigate(`/student/leave/${leave.id}`)} className="w-full text-left">
                <Card accentColor="var(--color-border-strong)" className="pl-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[var(--color-ink)]">{leave.leaveType}</p>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                        {formatDate(leave.startDate)} – {formatDate(leave.endDate)} · {leave.days} day{leave.days > 1 ? 's' : ''}
                      </p>
                    </div>
                    <StatusBadge kind={leaveStatusKind(leave.status)}>
                      {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                    </StatusBadge>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )
      )}
    </Screen>
  );
}
