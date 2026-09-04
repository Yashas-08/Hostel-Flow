import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import Screen from '../../components/Screen';
import { Card, StatusBadge, complaintStatusKind, complaintStatusLabel } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import Button from '../../components/Button';
import type { Complaint } from '../../types';

function formatDate(d: string) {
  return new Date(d.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ComplaintsPage() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setComplaints(await api.get<Complaint[]>('/complaints'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your complaints.');
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
        <h1 className="font-display font-bold text-2xl text-[var(--color-ink)]">Complaints</h1>
        <Button size="sm" onClick={() => navigate('/student/complaints/new')}>
          Raise
        </Button>
      </div>

      {loading && <LoadingState label="Loading complaints" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && complaints && (
        complaints.length === 0 ? (
          <EmptyState
            title="No complaints yet"
            description="Complaints you raise and their status will show up here."
            action={<Button size="sm" onClick={() => navigate('/student/complaints/new')}>Raise a complaint</Button>}
          />
        ) : (
          <div className="space-y-2.5">
            {complaints.map((c) => (
              <button key={c.id} type="button" onClick={() => navigate(`/student/complaints/${c.id}`)} className="w-full text-left">
                <Card accentColor="var(--color-border-strong)" className="pl-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[var(--color-ink)] truncate">{c.title}</p>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                        {c.category} · {formatDate(c.createdAt)}
                      </p>
                    </div>
                    <StatusBadge kind={complaintStatusKind(c.status)}>{complaintStatusLabel(c.status)}</StatusBadge>
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
