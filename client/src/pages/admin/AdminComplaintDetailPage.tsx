import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import AdminScreen from '../../components/admin/AdminScreen';
import { Card, StatusBadge, complaintStatusKind, complaintStatusLabel, FieldWrap, Select, Textarea } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import Button from '../../components/Button';
import type { AdminComplaintDetail } from '../../types';

function formatDateTime(d: string) {
  return new Date(d.replace(' ', 'T') + 'Z').toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

const STATUSES = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function AdminComplaintDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState<AdminComplaintDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<AdminComplaintDetail>(`/admin/complaints/${id}`);
      setComplaint(data);
      setStatus(data.status);
      setNotes(data.resolutionNotes || '');
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

  async function save() {
    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      await api.patch(`/admin/complaints/${id}`, { status, resolutionNotes: notes.trim() || null });
      setSaved(true);
      await load();
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminScreen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-4 flex items-center gap-3 lg:pt-8 lg:pb-6 lg:border-b lg:border-[var(--color-border)] lg:mb-6">
        <button onClick={() => navigate('/admin/complaints')} aria-label="Back to complaints" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)] shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display font-bold text-lg lg:text-2xl text-[var(--color-ink)]">Complaint</h1>
      </div>

      {loading && <LoadingState label="Loading" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && complaint && (
        <div className="space-y-4 lg:flex lg:items-start lg:gap-6 lg:space-y-0">
          <Card className="lg:flex-1 lg:min-w-0">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-display font-bold text-lg text-[var(--color-ink)] leading-snug">{complaint.title}</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{complaint.studentName} · {complaint.studentCode}</p>
              </div>
              <StatusBadge kind={complaintStatusKind(complaint.status)}>{complaintStatusLabel(complaint.status)}</StatusBadge>
            </div>

            {complaint.imageUrl && (
              <img src={complaint.imageUrl} alt="Complaint attachment" className="w-full rounded-[var(--radius-md)] object-cover mb-3 max-h-56" />
            )}

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Category</dt><dd>{complaint.category}</dd></div>
              {complaint.location && <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Location</dt><dd className="text-right">{complaint.location}</dd></div>}
              <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Priority</dt><dd className="capitalize">{complaint.priority}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Submitted</dt><dd className="text-right">{formatDateTime(complaint.createdAt)}</dd></div>
            </dl>
            <div className="pt-3 mt-3 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-ink-muted)] mb-1">Description</p>
              <p className="text-sm text-[var(--color-ink)] whitespace-pre-line">{complaint.description}</p>
            </div>
          </Card>

          <Card className="lg:w-96 lg:shrink-0">
            <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">Update status</p>
            <FieldWrap label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </FieldWrap>
            <div className="mt-3">
              <FieldWrap label="Resolution notes">
                <Textarea
                  placeholder="Add notes about how this was handled"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </FieldWrap>
            </div>
            {saveError && <p className="text-sm text-[var(--color-danger)] mt-2">{saveError}</p>}
            {saved && !saveError && <p className="text-sm text-[var(--color-success)] mt-2">Saved.</p>}
            <Button size="sm" className="mt-3" loading={saving} onClick={save}>
              Save changes
            </Button>
          </Card>
        </div>
      )}
    </AdminScreen>
  );
}
