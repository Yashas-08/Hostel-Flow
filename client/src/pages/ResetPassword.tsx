import { useState, type FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import Button from '../components/Button';
import { Input, FieldWrap } from '../components/primitives';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('Password reset token is missing. Please request a new link.');
      return;
    }

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token: token.trim(),
        password,
        confirmPassword,
      });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not reset password. The link may be invalid or expired.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Token is completely absent from URL
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-10">
        <div className="mx-auto w-full max-w-sm text-center">
          <div className="h-12 w-12 rounded-[var(--radius-md)] bg-[var(--color-danger-soft)] text-[var(--color-danger)] flex items-center justify-center mb-5 mx-auto">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="font-display font-extrabold text-[22px] text-[var(--color-ink)] mb-2">Invalid Reset Link</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mb-6">
            This password reset link is missing its authentication token or is malformed. Please request a new link.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8">
          <div className="h-12 w-12 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
              <path d="m21 2-9.6 9.6" />
              <circle cx="7.5" cy="15.5" r="5.5" />
            </svg>
          </div>
          <h1 className="font-display font-extrabold text-[26px] text-[var(--color-ink)]">Choose New Password</h1>
          <p className="text-[15px] text-[var(--color-ink-muted)] mt-1">
            Create a strong new password for your account.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-6">
            <div className="rounded-[var(--radius-md)] border border-[var(--color-success)] bg-[var(--color-success-soft)] p-4 text-[var(--color-success)]">
              <div className="flex items-start gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div className="text-sm">
                  <p className="font-semibold mb-1">Password reset successfully</p>
                  <p>Your password has been updated. You can now sign in with your new credentials.</p>
                </div>
              </div>
            </div>

            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Sign In to Your Account
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FieldWrap label="New Password">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </FieldWrap>

            <FieldWrap label="Confirm New Password">
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors p-1"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </FieldWrap>

            {error && (
              <div role="alert" className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-[var(--radius-sm)] px-3 py-2 space-y-1">
                <p>{error}</p>
                {(error.includes('expired') || error.includes('invalid') || error.includes('already been used')) && (
                  <p className="text-xs">
                    <Link to="/forgot-password" className="underline font-medium">
                      Click here to request a new password reset link
                    </Link>
                  </p>
                )}
              </div>
            )}

            <Button type="submit" fullWidth loading={loading}>
              Reset Password
            </Button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                Return to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
