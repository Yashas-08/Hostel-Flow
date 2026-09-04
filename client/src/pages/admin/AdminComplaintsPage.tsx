import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import { Card, Select, Input, StatusBadge, complaintStatusKind, complaintStatusLabel } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import type { AdminComplaintSummary } from '../../types';

function formatDate(d: string) {
  return new Date(d.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function AdminComplaintsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<AdminComplaintSummary[] | null>(null);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(s = status, q = query) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (s) params.set('status', s);
      if (q.trim()) params.set('q', q.trim());
      const qs = params.toString();
      setComplaints(await api.get<AdminComplaintSummary[]>(`/admin/complaints${qs ? `?${qs}` : ''}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load complaints.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <AdminHeader name={user?.fullName ?? ''} title="Complaints" />
      <AdminScreen>
        <div className="pb-4 lg:flex lg:items-end lg:justify-between lg:gap-4 lg:pb-5">
          <h1 className="font-display font-bold text-2xl text-[var(--color-ink)] mb-3 lg:mb-0 lg:shrink-0">Complaints</h1>
          <div className="flex flex-col gap-2 lg:flex-row lg:shrink-0">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); load(e.target.value, query); }} className="lg:w-44">
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </Select>
            <Input
              placeholder="Search by title or student"
              value={query}
              onChange={(e) => { setQuery(e.target.value); load(status, e.target.value); }}
              className="lg:w-64"
            />
          </div>
        </div>

        {loading && <LoadingState label="Loading complaints" />}
        {!loading && error && <ErrorState message={error} onRetry={() => load()} />}
        {!loading && !error && complaints && (
          complaints.length === 0 ? (
            <EmptyState title="No complaints" description="Nothing matches the current filter." />
          ) : (
            <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 xl:grid-cols-3">
              {complaints.map((c) => (
                <button key={c.id} type="button" onClick={() => navigate(`/admin/complaints/${c.id}`)} className="w-full text-left">
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[var(--color-ink)] truncate">{c.title}</p>
                        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                          {c.studentName} · {c.category} · {formatDate(c.createdAt)}
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
      </AdminScreen>
    </>
  );
}
