import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import Screen from '../../components/Screen';
import RoomCard from '../../components/RoomCard';
import QuickActions from '../../components/QuickActions';
import StatusSection from '../../components/StatusSection';
import NoticesList from '../../components/NoticesList';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import type { RoomInfo, DashboardSummary, Notice } from '../../types';

interface DashboardData {
  room: RoomInfo | null;
  summary: DashboardSummary;
  notices: Notice[];
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [summary, notices, room] = await Promise.all([
        api.get<DashboardSummary>('/students/me/dashboard'),
        api.get<Notice[]>('/notices'),
        api.get<RoomInfo>('/students/me/room').catch((e) => {
          if (e instanceof ApiError && e.status === 404) return null;
          throw e;
        }),
      ]);
      setData({ room, summary, notices });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Header name={user?.fullName ?? ''} subtitle="Welcome back" />
      <Screen>
        {loading && <LoadingState label="Loading your dashboard" />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && data && (
          <div className="space-y-5 mt-1">
            {data.room ? (
              <RoomCard room={data.room} />
            ) : (
              <EmptyState title="No room allocated yet" description="Your room details will appear here once the hostel admin allocates a bed." />
            )}

            <QuickActions />

            <StatusSection summary={data.summary} />

            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">Recent notices</p>
              </div>
              {data.notices.length === 0 ? (
                <EmptyState title="No notices yet" description="Hostel announcements will show up here." />
              ) : (
                <NoticesList notices={data.notices} limit={3} />
              )}
            </div>
          </div>
        )}
      </Screen>
    </>
  );
}
