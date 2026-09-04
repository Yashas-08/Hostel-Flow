import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import { Card, StatusBadge, noticePriorityKind, noticePriorityLabel } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import Button from '../../components/Button';
import type { AdminNotice } from '../../types';

function formatDate(d: string) {
  return new Date(d.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function AdminNoticesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notices, setNotices] = useState<AdminNotice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setNotices(await api.get<AdminNotice[]>('/admin/notices'));
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
    <>
      <AdminHeader name={user?.fullName ?? ''} title="Notices" />
      <AdminScreen>
        <div className="pb-4 flex items-center justify-between lg:pb-5">
          <h1 className="font-display font-bold text-2xl text-[var(--color-ink)]">Notices</h1>
          <Button size="sm" onClick={() => navigate('/admin/notices/new')}>New</Button>
        </div>

        {loading && <LoadingState label="Loading notices" />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && notices && (
          notices.length === 0 ? (
            <EmptyState
              title="No notices yet"
              description="Create your first hostel notice."
              action={<Button size="sm" onClick={() => navigate('/admin/notices/new')}>New notice</Button>}
            />
          ) : (
            <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 xl:grid-cols-3">
              {notices.map((n) => (
                <button key={n.id} type="button" onClick={() => navigate(`/admin/notices/${n.id}`)} className="w-full text-left">
                  <Card accentColor={n.priority !== 'normal' ? 'var(--color-warning)' : 'var(--color-border-strong)'} className="pl-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[var(--color-ink)] truncate">{n.title}</p>
                        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{n.category} · {formatDate(n.createdAt)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <StatusBadge kind={noticePriorityKind(n.priority)}>{noticePriorityLabel(n.priority)}</StatusBadge>
                        <StatusBadge kind={n.published ? 'success' : 'neutral'}>{n.published ? 'Published' : 'Draft'}</StatusBadge>
                      </div>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          )
        )}
      </AdminScreen>
    </>
  );
}
