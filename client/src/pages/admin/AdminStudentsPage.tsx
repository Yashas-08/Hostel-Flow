import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import { Card, Input, StatusBadge } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import Button from '../../components/Button';
import type { AdminStudentSummary } from '../../types';

function genderLabel(g: AdminStudentSummary['gender']) {
  if (g === 'male') return 'Male';
  if (g === 'female') return 'Female';
  return '—';
}

export default function AdminStudentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<AdminStudentSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(q?: string) {
    setLoading(true);
    setError(null);
    try {
      const path = q && q.trim() ? `/admin/students?q=${encodeURIComponent(q.trim())}` : '/admin/students';
      setStudents(await api.get<AdminStudentSummary[]>(path));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load students.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleSearchChange(value: string) {
    setQuery(value);
    load(value);
  }

  return (
    <>
      <AdminHeader name={user?.fullName ?? ''} title="Students" />
      <AdminScreen>
        <div className="pb-4 lg:flex lg:items-end lg:justify-between lg:gap-4 lg:pb-5">
          <h1 className="font-display font-bold text-2xl text-[var(--color-ink)] mb-3 lg:mb-0 lg:shrink-0">Students</h1>
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <Input
              placeholder="Search by name, email, or student ID"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="lg:max-w-sm"
            />
            <Button size="sm" onClick={() => navigate('/admin/students/admit')} className="shrink-0">
              Admit student
            </Button>
          </div>
        </div>

        {loading && <LoadingState label="Loading students" />}
        {!loading && error && <ErrorState message={error} onRetry={() => load(query)} />}
        {!loading && !error && students && (
          students.length === 0 ? (
            <EmptyState
              title="No students found"
              description="Try a different search term, or admit a new student."
              action={<Button size="sm" onClick={() => navigate('/admin/students/admit')}>Admit student</Button>}
            />
          ) : (
            <>
              {/* Mobile / tablet: card list */}
              <div className="space-y-2.5 lg:hidden">
                {students.map((s) => (
                  <button key={s.id} type="button" onClick={() => navigate(`/admin/students/${s.id}`)} className="w-full text-left">
                    <Card>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-[var(--color-ink)] truncate">{s.fullName}</p>
                          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 font-mono-data">{s.studentCode}</p>
                          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                            {s.course}{s.year ? ` · Year ${s.year}` : ''}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <StatusBadge kind="neutral">{genderLabel(s.gender)}</StatusBadge>
                            <StatusBadge kind="success">{s.status === 'active' ? 'Active' : s.status}</StatusBadge>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {s.room ? (
                            <>
                              <p className="text-xs font-semibold text-[var(--color-ink)]">{s.room.roomNumber}</p>
                              <p className="text-xs text-[var(--color-ink-muted)]">{s.room.block}</p>
                            </>
                          ) : (
                            <p className="text-xs text-[var(--color-ink-faint)]">No room</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </button>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden lg:block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Student ID</th>
                      <th className="px-4 py-3 font-medium">Gender</th>
                      <th className="px-4 py-3 font-medium">Block</th>
                      <th className="px-4 py-3 font-medium">Room</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => navigate(`/admin/students/${s.id}`)}
                        className="border-b border-[var(--color-border)] last:border-0 cursor-pointer hover:bg-[var(--color-bg)] transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-[var(--color-ink)]">{s.fullName}</td>
                        <td className="px-4 py-3 font-mono-data text-[var(--color-ink-muted)]">{s.studentCode}</td>
                        <td className="px-4 py-3 text-[var(--color-ink-muted)]">{genderLabel(s.gender)}</td>
                        <td className="px-4 py-3 text-[var(--color-ink-muted)]">{s.room ? s.room.block : '—'}</td>
                        <td className="px-4 py-3 text-[var(--color-ink)]">{s.room ? s.room.roomNumber : <span className="text-[var(--color-ink-faint)]">No room</span>}</td>
                        <td className="px-4 py-3">
                          <StatusBadge kind="success">{s.status === 'active' ? 'Active' : s.status}</StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        )}
      </AdminScreen>
    </>
  );
}
