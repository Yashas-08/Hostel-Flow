import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import Screen from '../../components/Screen';
import { Switch } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import type { NotificationPrefs } from '../../types';

const OPTIONS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: 'leaveUpdates', label: 'Leave updates', description: 'When your leave request is approved, rejected, or updated' },
  { key: 'complaintUpdates', label: 'Complaint updates', description: 'When a complaint you raised changes status' },
  { key: 'notices', label: 'Hostel notices', description: 'New hostel announcements and notices' },
];

export default function NotificationSettingsPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toastError, setToastError] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setPrefs(await api.get<NotificationPrefs>('/students/me/notifications'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load notification settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(key: keyof NotificationPrefs, next: boolean) {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, [key]: next });
    setSavingKey(key);
    setToastError('');
    try {
      const updated = await api.patch<NotificationPrefs>('/students/me/notifications', { [key]: next });
      setPrefs(updated);
    } catch (e) {
      setPrefs(previous);
      setToastError(e instanceof ApiError ? e.message : 'Could not save that change. Please try again.');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <Screen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-5 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display font-bold text-lg text-[var(--color-ink)]">Notification settings</h1>
      </div>

      {loading && <LoadingState label="Loading settings" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && prefs && (
        <div className="space-y-4">
          {toastError && (
            <p role="alert" className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-[var(--radius-sm)] px-3 py-2">
              {toastError}
            </p>
          )}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] px-4">
            {OPTIONS.map((opt, i) => (
              <div
                key={opt.key}
                className={[
                  'flex items-center justify-between gap-3 py-4',
                  i < OPTIONS.length - 1 ? 'border-b border-[var(--color-border)]' : '',
                ].join(' ')}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{opt.label}</p>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{opt.description}</p>
                </div>
                <Switch
                  checked={prefs[opt.key]}
                  onChange={(next) => toggle(opt.key, next)}
                  disabled={savingKey === opt.key}
                  label={opt.label}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </Screen>
  );
}
