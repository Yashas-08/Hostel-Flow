import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import AdminScreen from '../../components/admin/AdminScreen';
import { Card, StatusBadge, FieldWrap, Input } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import Button from '../../components/Button';
import type { AdminRoomDetail, AdminStudentSummary, RoomStatus } from '../../types';

function statusKind(status: RoomStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'available') return 'success';
  if (status === 'partial') return 'warning';
  return 'danger';
}

export default function AdminRoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<AdminRoomDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [floor, setFloor] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AdminStudentSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<AdminRoomDetail>(`/admin/rooms/${id}`);
      setRoom(data);
      setFloor(String(data.floor));
      setRoomNumber(data.roomNumber);
      setCapacity(String(data.capacity));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this room.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveEdit() {
    setEditErrors({});
    setSaving(true);
    try {
      await api.patch(`/admin/rooms/${id}`, {
        floor: Number(floor),
        roomNumber: roomNumber.trim(),
        capacity: Number(capacity),
      });
      setEditing(false);
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.fields) setEditErrors(e.fields);
      else setEditErrors({ _: e instanceof ApiError ? e.message : 'Could not save changes.' });
    } finally {
      setSaving(false);
    }
  }

  async function runSearch(q: string) {
    setSearch(q);
    setActionError('');
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await api.get<AdminStudentSummary[]>(`/admin/students?q=${encodeURIComponent(q.trim())}`);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function allocate(studentId: number) {
    setActionBusyId(studentId);
    setActionError('');
    try {
      await api.post(`/admin/rooms/${id}/allocate`, { studentId });
      setSearch('');
      setResults([]);
      await load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not allocate this student.');
    } finally {
      setActionBusyId(null);
    }
  }

  async function deallocate(studentId: number) {
    setActionBusyId(studentId);
    setActionError('');
    try {
      await api.post(`/admin/rooms/${id}/deallocate`, { studentId });
      await load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not remove this student.');
    } finally {
      setActionBusyId(null);
    }
  }

  return (
    <AdminScreen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-4 flex items-center gap-3 lg:pt-8 lg:pb-6 lg:border-b lg:border-[var(--color-border)] lg:mb-6">
        <button onClick={() => navigate('/admin/rooms')} aria-label="Back to rooms" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)] shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display font-bold text-lg lg:text-2xl text-[var(--color-ink)]">Room</h1>
      </div>

      {loading && <LoadingState label="Loading room" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && room && (
        <div className="lg:flex lg:items-start lg:gap-6">
        <div className="space-y-5 lg:w-96 lg:shrink-0">
          <Card>
            {!editing ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display font-bold text-xl text-[var(--color-ink)]">Room {room.roomNumber}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{room.hostel} · {room.block} · Floor {room.floor}</p>
                  </div>
                  <StatusBadge kind={statusKind(room.status)}>{room.status}</StatusBadge>
                </div>
                <p className="text-sm text-[var(--color-ink-muted)] mt-2">{room.occupied} / {room.capacity} occupied</p>
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => setEditing(true)}>
                  Edit room
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <FieldWrap label="Floor" error={editErrors.floor}>
                  <Input type="number" value={floor} onChange={(e) => setFloor(e.target.value)} error={editErrors.floor} />
                </FieldWrap>
                <FieldWrap label="Room number" error={editErrors.roomNumber}>
                  <Input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} error={editErrors.roomNumber} />
                </FieldWrap>
                <FieldWrap label="Capacity" error={editErrors.capacity}>
                  <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} error={editErrors.capacity} />
                </FieldWrap>
                {editErrors._ && <p className="text-xs text-[var(--color-danger)]">{editErrors._}</p>}
                <div className="flex gap-2">
                  <Button size="sm" loading={saving} onClick={saveEdit}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5 mt-5 lg:mt-0 lg:flex-1 lg:min-w-0">
          <div>
            <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-2.5">
              Occupants ({room.occupants.length})
            </p>
            {room.occupants.length === 0 ? (
              <Card><p className="text-sm text-[var(--color-ink-muted)]">No students allocated yet</p></Card>
            ) : (
              <div className="space-y-1.5 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0">
                {room.occupants.map((o) => (
                  <Card key={o.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-ink)]">{o.fullName}</p>
                      <p className="text-xs text-[var(--color-ink-muted)] font-mono-data">{o.studentCode}</p>
                    </div>
                    <Button size="sm" variant="ghost" loading={actionBusyId === o.id} onClick={() => deallocate(o.id)}>
                      Remove
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {room.status !== 'full' && (
            <div>
              <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-2.5">Allocate a student</p>
              <Input
                placeholder="Search by name, email, or student ID"
                value={search}
                onChange={(e) => runSearch(e.target.value)}
                className="lg:max-w-sm"
              />
              {actionError && <p className="text-xs text-[var(--color-danger)] mt-2">{actionError}</p>}
              {searching && <p className="text-xs text-[var(--color-ink-muted)] mt-2">Searching…</p>}
              {!searching && results.length > 0 && (
                <div className="space-y-1.5 mt-2.5 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0">
                  {results.map((s) => (
                    <Card key={s.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-ink)]">{s.fullName}</p>
                        <p className="text-xs text-[var(--color-ink-muted)]">
                          {s.room ? `Currently in ${s.room.roomNumber}, ${s.room.block}` : 'Unallocated'}
                        </p>
                      </div>
                      <Button size="sm" loading={actionBusyId === s.id} onClick={() => allocate(s.id)}>
                        Add
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      )}
    </AdminScreen>
  );
}
