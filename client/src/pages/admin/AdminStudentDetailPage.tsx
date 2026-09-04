import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import AdminScreen from '../../components/admin/AdminScreen';
import {
  Card, StatusBadge, leaveStatusKind, complaintStatusKind, complaintStatusLabel,
} from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import type { AdminStudentDetail } from '../../types';

function formatDate(d: string) {
  return new Date(d.includes('T') ? d : d.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminStudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<AdminStudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setStudent(await api.get<AdminStudentDetail>(`/admin/students/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this student.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <AdminScreen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-4 flex items-center gap-3 lg:pt-8 lg:pb-6 lg:border-b lg:border-[var(--color-border)] lg:mb-6">
        <button onClick={() => navigate('/admin/students')} aria-label="Back to students" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)] shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display font-bold text-lg lg:text-2xl text-[var(--color-ink)]">Student</h1>
      </div>

      {loading && <LoadingState label="Loading student" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && student && (
        <div className="lg:flex lg:items-start lg:gap-6">
          <div className="space-y-5 lg:w-80 lg:shrink-0">
            <Card>
              <p className="font-display font-bold text-xl text-[var(--color-ink)]">{student.fullName}</p>
              <p className="text-xs text-[var(--color-ink-muted)] font-mono-data mt-0.5">{student.studentCode}</p>
              <dl className="space-y-2 text-sm mt-3">
                <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Course</dt><dd>{student.course}{student.year ? ` · Year ${student.year}` : ''}</dd></div>
                {student.department && (
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Department</dt><dd>{student.department}</dd></div>
                )}
                {student.gender && (
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Gender</dt><dd className="capitalize">{student.gender}</dd></div>
                )}
                {student.dateOfBirth && (
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Date of birth</dt><dd>{formatDate(student.dateOfBirth)}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Email</dt><dd className="text-right">{student.email}</dd></div>
                {student.phone && <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Phone</dt><dd>{student.phone}</dd></div>}
              </dl>
            </Card>

            {student.guardian && (
              <div>
                <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-2.5">Parent / guardian</p>
                <Card>
                  <dl className="space-y-2 text-sm">
                    {student.guardian.relationship && (
                      <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Relationship</dt><dd>{student.guardian.relationship}</dd></div>
                    )}
                    {student.guardian.fatherName && (
                      <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Father's / guardian's name</dt><dd className="text-right">{student.guardian.fatherName}</dd></div>
                    )}
                    {student.guardian.fatherPhone && (
                      <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Father's / guardian's phone</dt><dd>{student.guardian.fatherPhone}</dd></div>
                    )}
                    {student.guardian.motherName && (
                      <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Mother's / guardian's name</dt><dd className="text-right">{student.guardian.motherName}</dd></div>
                    )}
                    {student.guardian.motherPhone && (
                      <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Mother's / guardian's phone</dt><dd>{student.guardian.motherPhone}</dd></div>
                    )}
                  </dl>
                </Card>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-2.5">Room</p>
              <Card>
                {student.room ? (
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Hostel</dt><dd>{student.room.hostel}</dd></div>
                    <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Block</dt><dd>{student.room.block}</dd></div>
                    <div className="flex justify-between"><dt className="text-[var(--color-ink-muted)]">Room number</dt><dd>{student.room.roomNumber}</dd></div>
                  </dl>
                ) : (
                  <p className="text-sm text-[var(--color-ink-muted)]">No room allocated</p>
                )}
              </Card>
            </div>
          </div>

          <div className="space-y-5 mt-5 lg:mt-0 lg:flex-1 lg:min-w-0">
            <div>
              <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-2.5">
                Attendance ({student.attendance.presentDaysTotal} days present)
              </p>
              {student.attendance.recent.length === 0 ? (
                <Card><p className="text-sm text-[var(--color-ink-muted)]">No attendance records</p></Card>
              ) : (
                <div className="space-y-1.5 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0">
                  {student.attendance.recent.slice(0, 5).map((a) => (
                    <Card key={a.date} className="flex items-center justify-between py-2.5">
                      <span className="text-sm text-[var(--color-ink)]">{formatDate(a.date)}</span>
                      <StatusBadge kind={a.status === 'present' ? 'success' : 'neutral'}>{a.status}</StatusBadge>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-2.5">
                Leave history ({student.leaves.length})
              </p>
              {student.leaves.length === 0 ? (
                <Card><p className="text-sm text-[var(--color-ink-muted)]">No leave requests</p></Card>
              ) : (
                <div className="space-y-1.5 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0">
                  {student.leaves.map((l) => (
                    <Card key={l.id} className="py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-ink)]">{l.leaveType}</p>
                          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{formatDate(l.startDate)} – {formatDate(l.endDate)}</p>
                        </div>
                        <StatusBadge kind={leaveStatusKind(l.status)}>{l.status}</StatusBadge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-2.5">
                Complaint history ({student.complaints.length})
              </p>
              {student.complaints.length === 0 ? (
                <Card><p className="text-sm text-[var(--color-ink-muted)]">No complaints</p></Card>
              ) : (
                <div className="space-y-1.5 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0">
                  {student.complaints.map((c) => (
                    <Card key={c.id} className="py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--color-ink)] truncate">{c.title}</p>
                          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{c.category}</p>
                        </div>
                        <StatusBadge kind={complaintStatusKind(c.status)}>{complaintStatusLabel(c.status)}</StatusBadge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminScreen>
  );
}
