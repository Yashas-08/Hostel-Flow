import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import { Switch } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import type { NotificationPrefs } from '../../types';

const OPTIONS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: 'leaveUpdates', label: 'Leave updates', description: 'New or updated leave requests from students' },
  { key: 'complaintUpdates', label: 'Complaint updates', description: 'New or updated complaints from students' },
  { key: 'notices', label: 'Hostel notices', description: 'Confirmation when notices are published' },
];

export default function AdminNotificationSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toastError, setToastError] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setPrefs(await api.get<NotificationPrefs>('/admin/me/notifications'));
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
      const updated = await api.patch<NotificationPrefs>('/admin/me/notifications', { [key]: next });
      setPrefs(updated);
    } catch (e) {
      setPrefs(previous);
      setToastError(e instanceof ApiError ? e.message : 'Could not save that change. Please try again.');
    } finally {
      setSavingKey(null);
    }
  }

  // Clicking anywhere in a row toggles it, except when the click lands on the Switch
  // itself — the Switch already has its own onClick, so without this guard a click on
  // the switch would fire both handlers and cancel itself out.
  function handleRowClick(e: React.MouseEvent, key: keyof NotificationPrefs, current: boolean) {
    const target = e.target as HTMLElement;
    if (target.closest('[role="switch"]')) return;
    toggle(key, !current);
  }

  return (
    <>
      <AdminHeader name={user?.fullName ?? ''} title="Notification settings" />
      <AdminScreen>
        <div className="lg:max-w-xl">
          <div className="pb-5 flex items-center gap-3 lg:hidden">
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

              {/*
                A single grid spans every row so the switch column's width is computed
                once across ALL rows — every switch lands at the exact same right-hand
                x-position and is the exact same size, regardless of how long any one
                row's label/description text is.
              */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] px-4 grid grid-cols-[1fr_auto] items-center">
                {OPTIONS.map((opt, i) => {
                  const checked = prefs[opt.key];
                  const isLast = i === OPTIONS.length - 1;
                  return (
                    <Fragment key={opt.key}>
                      <div
                        onClick={(e) => handleRowClick(e, opt.key, checked)}
                        className={[
                          'min-w-0 py-4 pr-4 cursor-pointer',
                          !isLast ? 'border-b border-[var(--color-border)]' : '',
                        ].join(' ')}
                      >
                        <p className="text-sm font-semibold text-[var(--color-ink)]">{opt.label}</p>
                        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{opt.description}</p>
                      </div>
                      <div
                        onClick={(e) => handleRowClick(e, opt.key, checked)}
                        className={[
                          'flex flex-col items-end gap-1 py-4 cursor-pointer',
                          !isLast ? 'border-b border-[var(--color-border)]' : '',
                        ].join(' ')}
                      >
                        <Switch
                          checked={checked}
                          onChange={(next) => toggle(opt.key, next)}
                          disabled={savingKey === opt.key}
                          label={opt.label}
                        />
                        <span
                          className={[
                            'text-[10px] font-bold uppercase tracking-wide leading-none',
                            checked ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-faint)]',
                          ].join(' ')}
                        >
                          {checked ? 'On' : 'Off'}
                        </span>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </AdminScreen>
    </>
  );
}
