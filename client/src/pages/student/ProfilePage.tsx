import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Screen from '../../components/Screen';
import { Avatar } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import Button from '../../components/Button';
import type { StudentProfile, RoomInfo } from '../../types';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-b-0 gap-3">
      <span className="text-sm text-[var(--color-ink-muted)] shrink-0">{label}</span>
      <span className="text-sm font-medium text-[var(--color-ink)] font-mono-data text-right">{value}</span>
    </div>
  );
}

function NavRow({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 py-3.5 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] text-left"
    >
      <div>
        <p className="text-sm font-semibold text-[var(--color-ink)]">{label}</p>
        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{description}</p>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-ink-faint)] shrink-0">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [profileData, roomData] = await Promise.all([
        api.get<StudentProfile>('/students/me'),
        api.get<RoomInfo>('/students/me/room').catch((e) => {
          if (e instanceof ApiError && e.status === 404) return null;
          throw e;
        }),
      ]);
      setProfile(profileData);
      setRoom(roomData);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your profile.');
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
        <h1 className="font-display font-bold text-2xl text-[var(--color-ink)]">Profile</h1>
      </div>

      {loading && <LoadingState label="Loading profile" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && profile && (
        <div className="space-y-5">
          <div className="flex items-center gap-3.5">
            <Avatar name={profile.fullName} size={56} src={profile.avatarUrl} />
            <div className="min-w-0">
              <p className="font-display font-bold text-lg text-[var(--color-ink)] truncate">{profile.fullName}</p>
              <p className="text-sm text-[var(--color-ink-muted)] truncate">
                {profile.course}{profile.year ? ` · Year ${profile.year}` : ''}
              </p>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] px-4">
            <Row label="Student ID" value={profile.studentCode} />
            <Row label="Email" value={profile.email} />
            {profile.phone && <Row label="Phone" value={profile.phone} />}
          </div>

          <div>
            <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-2.5">Housing</p>
            {room ? (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] px-4">
                <Row label="Hostel" value={room.hostel} />
                <Row label="Block" value={room.block} />
                <Row label="Room number" value={room.roomNumber} />
              </div>
            ) : (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] px-4 py-4">
                <p className="text-sm text-[var(--color-ink-muted)]">No room allocated yet.</p>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <NavRow
              label="Edit profile"
              description="Update your phone number and photo"
              onClick={() => navigate('/student/profile/edit')}
            />
            <NavRow
              label="Notification settings"
              description="Choose what you get notified about"
              onClick={() => navigate('/student/profile/notifications')}
            />
          </div>

          <Button variant="ghost" fullWidth onClick={logout}>
            Log out
          </Button>
        </div>
      )}
    </Screen>
  );
}
