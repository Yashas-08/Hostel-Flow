import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import Button from '../../components/Button';
import { FieldWrap, Input } from '../../components/primitives';

export default function AdminChangePasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSuccess(false);
    const errors: Record<string, string> = {};

    if (!currentPassword) errors.currentPassword = 'Enter your current password';
    if (!newPassword || newPassword.length < 8) errors.newPassword = 'New password must be at least 8 characters';
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    } else if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your new password';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) setFieldErrors(err.fields);
        else setFormError(err.message);
      } else {
        setFormError('Could not update your password. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminHeader name={user?.fullName ?? ''} title="Change password" />
      <AdminScreen>
        <div className="lg:max-w-xl">
          <div className="pb-5 flex items-center gap-3 lg:hidden">
            <button onClick={() => navigate(-1)} aria-label="Back" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 className="font-display font-bold text-lg text-[var(--color-ink)]">Change password</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FieldWrap label="Current password" error={fieldErrors.currentPassword}>
              <Input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                error={fieldErrors.currentPassword}
              />
            </FieldWrap>

            <FieldWrap label="New password" error={fieldErrors.newPassword}>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={fieldErrors.newPassword}
              />
            </FieldWrap>

            <FieldWrap label="Confirm new password" error={fieldErrors.confirmPassword}>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={fieldErrors.confirmPassword}
              />
            </FieldWrap>

            {formError && (
              <p role="alert" className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-[var(--radius-sm)] px-3 py-2">
                {formError}
              </p>
            )}
            {success && (
              <p className="text-sm text-[var(--color-success)] bg-[var(--color-success-soft)] rounded-[var(--radius-sm)] px-3 py-2">
                Password updated.
              </p>
            )}

            <Button type="submit" fullWidth loading={saving}>
              Update password
            </Button>
          </form>
        </div>
      </AdminScreen>
    </>
  );
}
