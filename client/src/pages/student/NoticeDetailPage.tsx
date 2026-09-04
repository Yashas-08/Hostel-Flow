import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import Screen from '../../components/Screen';
import { StatusBadge, noticePriorityKind, noticePriorityLabel } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import type { Notice } from '../../types';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function NoticeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setNotice(await api.get<Notice>(`/notices/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this notice.');
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
        <button onClick={() => navigate('/student/notices')} aria-label="Back to notices" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display font-bold text-lg text-[var(--color-ink)]">Notice</h1>
      </div>

      {loading && <LoadingState label="Loading notice" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && notice && (
        <div className="space-y-3">
          <StatusBadge kind={noticePriorityKind(notice.priority)}>
            {noticePriorityLabel(notice.priority)}
          </StatusBadge>
          <h2 className="font-display font-bold text-xl text-[var(--color-ink)] leading-snug">{notice.title}</h2>
          <p className="text-xs text-[var(--color-ink-muted)]">{notice.category} · {formatDate(notice.createdAt)}</p>
          <p className="text-[15px] text-[var(--color-ink)] leading-relaxed whitespace-pre-line">{notice.description}</p>
        </div>
      )}
    </Screen>
  );
}
