import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { api, ApiError } from '../../lib/api';
import Screen from '../../components/Screen';
import { Card, StatusBadge } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import type { LeaveRequest } from '../../types';

function formatDateTime(d: string) {
  return new Date(d.replace(' ', 'T') + 'Z').toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
}

export default function LeaveQrPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leave, setLeave] = useState<LeaveRequest | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<LeaveRequest>(`/leaves/${id}`);
      setLeave(data);
      if (data.qrCode) {
        const dataUrl = await QRCode.toDataURL(data.qrCode, { margin: 1, width: 260 });
        setQrImage(dataUrl);
      }
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

  const movementKind = leave?.checkedInAt ? 'success' : leave?.checkedOutAt ? 'warning' : 'neutral';
  const movementLabel = leave?.checkedInAt ? 'Checked back in' : leave?.checkedOutAt ? 'Checked out' : 'Not checked out yet';

  return (
    <Screen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-5 flex items-center gap-3">
        <button onClick={() => navigate(`/student/leave/${id}`)} aria-label="Back to leave request" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display font-bold text-lg text-[var(--color-ink)]">Leave QR</h1>
      </div>

      {loading && <LoadingState label="Loading QR" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && leave && (
        <div className="space-y-4">
          <Card className="flex flex-col items-center py-6">
            {qrImage ? (
              <img src={qrImage} alt="Leave check-in/check-out QR code" className="rounded-[var(--radius-md)]" width={260} height={260} />
            ) : (
              <p className="text-sm text-[var(--color-ink-muted)]">No QR available for this leave.</p>
            )}
            <p className="font-display font-bold text-lg text-[var(--color-ink)] mt-4">{leave.leaveType}</p>
            <p className="text-sm text-[var(--color-ink-muted)]">
              {new Date(leave.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(leave.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
            <div className="mt-3">
              <StatusBadge kind={movementKind}>{movementLabel}</StatusBadge>
            </div>
          </Card>

          {(leave.checkedOutAt || leave.checkedInAt) && (
            <Card>
              <dl className="space-y-2.5 text-sm">
                {leave.checkedOutAt && (
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Checked out</dt><dd>{formatDateTime(leave.checkedOutAt)}</dd></div>
                )}
                {leave.checkedInAt && (
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Checked in</dt><dd>{formatDateTime(leave.checkedInAt)}</dd></div>
                )}
              </dl>
            </Card>
          )}

          <p className="text-xs text-[var(--color-ink-muted)] text-center">
            Show this QR at the hostel gate when leaving and again when returning.
          </p>
        </div>
      )}
    </Screen>
  );
}
