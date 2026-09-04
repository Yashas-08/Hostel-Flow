import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import Screen from '../../components/Screen';
import NoticesList from '../../components/NoticesList';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import type { Notice } from '../../types';

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setNotices(await api.get<Notice[]>('/notices'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load notices.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Screen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-4">
        <h1 className="font-display font-bold text-2xl text-[var(--color-ink)]">Notices</h1>
      </div>
      {loading && <LoadingState label="Loading notices" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && notices && (
        notices.length === 0 ? (
          <EmptyState title="No notices yet" description="Hostel announcements will appear here as soon as they're published." />
        ) : (
          <NoticesList notices={notices} />
        )
      )}
    </Screen>
  );
}
