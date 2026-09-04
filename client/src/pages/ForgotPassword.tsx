import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import Button from '../components/Button';
import { Input, FieldWrap } from '../components/primitives';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not request password reset. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8">
          <div className="h-12 w-12 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="font-display font-extrabold text-[26px] text-[var(--color-ink)]">Forgot Password</h1>
          <p className="text-[15px] text-[var(--color-ink-muted)] mt-1">
            Enter your email to receive a secure password reset link.
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
                  <p className="font-semibold mb-1">Check your inbox</p>
                  <p>If an account exists for this email, you'll receive a password reset link shortly.</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-[var(--color-ink-muted)]">
              The reset link will remain valid for 15 minutes. Be sure to check your spam or promotions folder if you don't see it within a few minutes.
            </p>

            <div className="pt-2 text-center">
              <Link to="/login" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FieldWrap label="Email Address">
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FieldWrap>

            {error && (
              <p role="alert" className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-[var(--radius-sm)] px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth loading={loading}>
              Send Reset Link
            </Button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
