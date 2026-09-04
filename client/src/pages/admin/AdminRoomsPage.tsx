import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import { Card, Select, StatusBadge } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import type { AdminRoomSummary, AdminBlock, RoomStatus } from '../../types';

function statusKind(status: RoomStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'available') return 'success';
  if (status === 'partial') return 'warning';
  return 'danger';
}

export default function AdminRoomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<AdminRoomSummary[] | null>(null);
  const [blocks, setBlocks] = useState<AdminBlock[]>([]);
  const [blockFilter, setBlockFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(block = blockFilter, status = statusFilter) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (block) params.set('blockId', block);
      if (status) params.set('status', status);
      const qs = params.toString();
      const [roomsData, blocksData] = await Promise.all([
        api.get<AdminRoomSummary[]>(`/admin/rooms${qs ? `?${qs}` : ''}`),
        blocks.length ? Promise.resolve(blocks) : api.get<AdminBlock[]>('/admin/rooms/blocks'),
      ]);
      setRooms(roomsData);
      setBlocks(blocksData);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load rooms.');
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
      <AdminHeader name={user?.fullName ?? ''} title="Rooms" />
      <AdminScreen>
        <div className="pb-4 lg:flex lg:items-end lg:justify-between lg:gap-4 lg:pb-5">
          <h1 className="font-display font-bold text-2xl text-[var(--color-ink)] mb-3 lg:mb-0 lg:shrink-0">Rooms</h1>
          <div className="flex gap-2 lg:w-auto lg:shrink-0">
            <Select
              value={blockFilter}
              onChange={(e) => { setBlockFilter(e.target.value); load(e.target.value, statusFilter); }}
              className="flex-1 lg:w-44"
            >
              <option value="">All blocks</option>
              {blocks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); load(blockFilter, e.target.value); }}
              className="flex-1 lg:w-44"
            >
              <option value="">All statuses</option>
              <option value="available">Available</option>
              <option value="partial">Partial</option>
              <option value="full">Full</option>
            </Select>
          </div>
        </div>

        {loading && <LoadingState label="Loading rooms" />}
        {!loading && error && <ErrorState message={error} onRetry={() => load()} />}
        {!loading && !error && rooms && (
          rooms.length === 0 ? (
            <EmptyState title="No rooms found" description="Try a different filter." />
          ) : (
            <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 xl:grid-cols-3">
              {rooms.map((r) => (
                <button key={r.id} type="button" onClick={() => navigate(`/admin/rooms/${r.id}`)} className="w-full text-left">
                  <Card>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm text-[var(--color-ink)]">
                          {r.block} · Room {r.roomNumber}
                        </p>
                        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">Floor {r.floor} · {r.occupied}/{r.capacity} occupied</p>
                      </div>
                      <StatusBadge kind={statusKind(r.status)}>{r.status}</StatusBadge>
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
