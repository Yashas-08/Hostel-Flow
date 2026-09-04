import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import AdminScreen from '../../components/admin/AdminScreen';
import { Card, StatusBadge, leaveStatusKind, FieldWrap, Textarea } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import Button from '../../components/Button';
import type { AdminLeaveDetail } from '../../types';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AdminLeaveDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leave, setLeave] = useState<AdminLeaveDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setLeave(await api.get<AdminLeaveDetail>(`/admin/leaves/${id}`));
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

  async function approve() {
    setBusy(true);
    setActionError('');
    try {
      await api.patch(`/admin/leaves/${id}/approve`);
      await load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not approve this request.');
    } finally {
      setBusy(false);
    }
  }

  async function submitReject() {
    setReasonError('');
    if (!reason.trim()) {
      setReasonError('A rejection reason is required');
      return;
    }
    setBusy(true);
    setActionError('');
    try {
      await api.patch(`/admin/leaves/${id}/reject`, { reason: reason.trim() });
      setRejecting(false);
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.fields) setReasonError(e.fields.reason || e.message);
      else setActionError(e instanceof ApiError ? e.message : 'Could not reject this request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminScreen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-4 flex items-center gap-3 lg:pt-8 lg:pb-6 lg:border-b lg:border-[var(--color-border)] lg:mb-6">
        <button onClick={() => navigate('/admin/leaves')} aria-label="Back to leaves" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)] shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display font-bold text-lg lg:text-2xl text-[var(--color-ink)]">Leave request</h1>
      </div>

      {loading && <LoadingState label="Loading" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && leave && (
        <div className="space-y-4 lg:max-w-xl">
          <Card>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-display font-bold text-xl text-[var(--color-ink)]">{leave.studentName}</p>
                <p className="text-xs text-[var(--color-ink-muted)] font-mono-data">{leave.studentCode}</p>
              </div>
              <StatusBadge kind={leaveStatusKind(leave.status)}>{leave.status}</StatusBadge>
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Type</dt><dd>{leave.leaveType}</dd></div>
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
                <p className="text-xs text-[var(--color-danger)] mb-1">Rejection reason</p>
                <p className="text-sm text-[var(--color-ink)]">{leave.rejectionReason}</p>
              </div>
            )}
            {leave.status === 'approved' && (leave.checkedOutAt || leave.checkedInAt) && (
              <div className="pt-3 mt-3 border-t border-[var(--color-border)] space-y-1.5">
                <p className="text-xs text-[var(--color-ink-muted)] mb-1">Movement</p>
                {leave.checkedOutAt && (
                  <div className="flex justify-between text-sm"><span className="text-[var(--color-ink-muted)]">Checked out</span><span>{formatDate(leave.checkedOutAt)}</span></div>
                )}
                {leave.checkedInAt && (
                  <div className="flex justify-between text-sm"><span className="text-[var(--color-ink-muted)]">Checked in</span><span>{formatDate(leave.checkedInAt)}</span></div>
                )}
              </div>
            )}
          </Card>

          {leave.status === 'pending' && (
            <div className="space-y-3">
              {actionError && <p className="text-sm text-[var(--color-danger)]">{actionError}</p>}
              {!rejecting ? (
                <div className="flex gap-2">
                  <Button fullWidth loading={busy} onClick={approve}>Approve</Button>
                  <Button fullWidth variant="ghost" onClick={() => setRejecting(true)}>Reject</Button>
                </div>
              ) : (
                <Card>
                  <FieldWrap label="Rejection reason" error={reasonError}>
                    <Textarea
                      placeholder="Explain why this leave request is being rejected"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      error={reasonError}
                    />
                  </FieldWrap>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="danger" loading={busy} onClick={submitReject}>Confirm reject</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRejecting(false); setReason(''); setReasonError(''); }}>Cancel</Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </AdminScreen>
  );
}
