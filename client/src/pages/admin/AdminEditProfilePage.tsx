import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import Button from '../../components/Button';
import { Avatar, FieldWrap, Input } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/States';
import type { AdminProfile } from '../../types';

const MAX_AVATAR_BYTES = 1.3 * 1024 * 1024; // matches the server-side ceiling

export default function AdminEditProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null | undefined>(undefined);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<AdminProfile>('/auth/me');
      setProfile(data);
      setFullName(data.fullName || '');
      setPhone(data.phone || '');
      setAvatarPreview(data.avatarUrl ?? null);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFieldErrors((prev) => ({ ...prev, avatarUrl: 'Please choose an image file' }));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setFieldErrors((prev) => ({ ...prev, avatarUrl: 'Photo must be under 1.3MB' }));
      return;
    }
    setFieldErrors((prev) => {
      const rest = { ...prev };
      delete rest.avatarUrl;
      return rest;
    });

    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    if (!fullName.trim()) {
      setFieldErrors({ fullName: 'Full name is required' });
      return;
    }

    setSaving(true);
    try {
      await api.patch<AdminProfile>('/admin/me', {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        avatarUrl: avatarPreview === undefined ? undefined : avatarPreview,
      });
      navigate('/admin/profile', { replace: true, state: { profileUpdated: true } });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) setFieldErrors(err.fields);
        else setFormError(err.message);
      } else {
        setFormError('Could not save your changes. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminHeader name={profile?.fullName ?? ''} title="Edit profile" />
      <AdminScreen>
        <div className="lg:max-w-xl">
          <div className="pb-5 flex items-center gap-3 lg:hidden">
            <button onClick={() => navigate(-1)} aria-label="Back" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 className="font-display font-bold text-lg text-[var(--color-ink)]">Edit profile</h1>
          </div>

          {loading && <LoadingState label="Loading profile" />}
          {!loading && loadError && <ErrorState message={loadError} onRetry={load} />}
          {!loading && !loadError && profile && (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="flex flex-col items-center gap-3">
                <Avatar name={profile.fullName} size={80} src={avatarPreview} />
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-semibold text-[var(--color-primary)]">
                    {avatarPreview ? 'Change photo' : 'Add photo'}
                  </button>
                  {avatarPreview && (
                    <button type="button" onClick={removePhoto} className="text-sm font-semibold text-[var(--color-danger)]">
                      Remove
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                {fieldErrors.avatarUrl && <p className="text-xs text-[var(--color-danger)]">{fieldErrors.avatarUrl}</p>}
              </div>

              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 space-y-1">
                <p className="text-xs text-[var(--color-ink-muted)]">
                  Email is your account identity and can't be edited here.
                </p>
              </div>

              <FieldWrap label="Full name" error={fieldErrors.fullName}>
                <Input
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  error={fieldErrors.fullName}
                />
              </FieldWrap>

              <FieldWrap label="Phone" error={fieldErrors.phone}>
                <Input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  error={fieldErrors.phone}
                />
              </FieldWrap>

              {formError && (
                <p role="alert" className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-[var(--radius-sm)] px-3 py-2">
                  {formError}
                </p>
              )}

              <Button type="submit" fullWidth loading={saving}>
                Save changes
              </Button>
            </form>
          )}
        </div>
      </AdminScreen>
    </>
  );
}
