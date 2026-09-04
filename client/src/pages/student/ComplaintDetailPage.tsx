import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import Screen from '../../components/Screen';
import { Card, StatusBadge, complaintStatusKind, complaintStatusLabel } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import type { Complaint } from '../../types';

function formatDateTime(d: string) {
  return new Date(d.replace(' ', 'T') + 'Z').toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const justSubmitted = (location.state as { justSubmitted?: boolean })?.justSubmitted;

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setComplaint(await api.get<Complaint>(`/complaints/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this complaint.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <Screen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-4 flex items-center gap-3">
        <button onClick={() => navigate('/student/complaints')} aria-label="Back" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display font-bold text-lg text-[var(--color-ink)]">Complaint</h1>
      </div>

      {justSubmitted && (
        <p className="text-sm text-[var(--color-success)] bg-[var(--color-success-soft)] rounded-[var(--radius-sm)] px-3 py-2 mb-4">
          Complaint submitted.
        </p>
      )}

      {loading && <LoadingState label="Loading" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && complaint && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="font-display font-bold text-xl text-[var(--color-ink)] leading-snug">{complaint.title}</p>
              <StatusBadge kind={complaintStatusKind(complaint.status)}>{complaintStatusLabel(complaint.status)}</StatusBadge>
            </div>

            {complaint.imageUrl && (
              <img
                src={complaint.imageUrl}
                alt="Complaint attachment"
                className="w-full rounded-[var(--radius-md)] object-cover mb-3 max-h-56"
              />
            )}

            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Category</dt><dd>{complaint.category}</dd></div>
              {complaint.location && (
                <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Location</dt><dd className="text-right">{complaint.location}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Priority</dt><dd className="capitalize">{complaint.priority}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Submitted</dt><dd className="text-right">{formatDateTime(complaint.createdAt)}</dd></div>
              {complaint.updatedAt !== complaint.createdAt && (
                <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Last update</dt><dd className="text-right">{formatDateTime(complaint.updatedAt)}</dd></div>
              )}
            </dl>

            <div className="pt-3 mt-3 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-ink-muted)] mb-1">Description</p>
              <p className="text-sm text-[var(--color-ink)] whitespace-pre-line">{complaint.description}</p>
            </div>

            {complaint.resolutionNotes && (
              <div className="pt-3 mt-3 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-ink-muted)] mb-1">Resolution notes</p>
                <p className="text-sm text-[var(--color-ink)] whitespace-pre-line">{complaint.resolutionNotes}</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </Screen>
  );
}
