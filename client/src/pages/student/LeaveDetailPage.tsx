import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import Screen from '../../components/Screen';
import { Card, StatusBadge, leaveStatusKind } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import Button from '../../components/Button';
import type { LeaveRequest } from '../../types';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function LeaveDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const justSubmitted = (location.state as { justSubmitted?: boolean })?.justSubmitted;

  const [leave, setLeave] = useState<LeaveRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setLeave(await api.get<LeaveRequest>(`/leaves/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this leave request.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCancel() {
    if (!leave) return;
    setCancelling(true);
    setCancelError('');
    try {
      await api.patch(`/leaves/${leave.id}/cancel`);
      await load();
    } catch (e) {
      setCancelError(e instanceof ApiError ? e.message : 'Could not cancel this request.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Screen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-4 flex items-center gap-3">
        <button onClick={() => navigate('/student/leave')} aria-label="Back" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display font-bold text-lg text-[var(--color-ink)]">Leave request</h1>
      </div>

      {justSubmitted && (
        <p className="text-sm text-[var(--color-success)] bg-[var(--color-success-soft)] rounded-[var(--radius-sm)] px-3 py-2 mb-4">
          Leave request submitted.
        </p>
      )}

      {loading && <LoadingState label="Loading" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && leave && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between mb-3">
              <p className="font-display font-bold text-xl text-[var(--color-ink)]">{leave.leaveType}</p>
              <StatusBadge kind={leaveStatusKind(leave.status)}>
                {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
              </StatusBadge>
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Start date</dt><dd>{formatDate(leave.startDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">End date</dt><dd>{formatDate(leave.endDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Duration</dt><dd>{leave.days} day{leave.days > 1 ? 's' : ''}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Applied on</dt><dd>{formatDate(leave.appliedAt)}</dd></div>
            </dl>
            <div className="pt-3 mt-3 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-ink-muted)] mb-1">Reason</p>
              <p className="text-sm text-[var(--color-ink)]">{leave.reason}</p>
            </div>
            {leave.status === 'rejected' && leave.rejectionReason && (
              <div className="pt-3 mt-3 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-danger)] mb-1">Reason for rejection</p>
                <p className="text-sm text-[var(--color-ink)]">{leave.rejectionReason}</p>
              </div>
            )}
          </Card>

          {leave.status === 'approved' && leave.qrCode && (
            <div>
              <Button fullWidth onClick={() => navigate(`/student/leave/${leave.id}/qr`)}>
                View check-in / check-out QR
              </Button>
            </div>
          )}

          {leave.status === 'pending' && (
            <div>
              {cancelError && <p className="text-sm text-[var(--color-danger)] mb-2">{cancelError}</p>}
              <Button variant="ghost" fullWidth loading={cancelling} onClick={handleCancel}>
                Cancel request
              </Button>
            </div>
          )}
        </div>
      )}
    </Screen>
  );
}
