import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, ApiError } from '../../context/AuthContext';
import Button from '../../components/Button';
import { Input, FieldWrap } from '../../components/primitives';

export default function AdminSignup() {
  const { adminSignup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    if (!inviteCode.trim()) {
      setError('Admin invite code is required.');
      return;
    }

    if (!password) {
      setError('Password is required.');
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
      await adminSignup({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        inviteCode: inviteCode.trim(),
      });
      // Newly created admin is routed directly to the admin dashboard
      navigate('/admin', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not create admin account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 relative">
      <header className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <Link
          to="/signup"
          title="Student Registration"
          aria-label="Student Registration"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full sm:rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] text-xs sm:text-[13px] font-medium transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          </svg>
          <span className="hidden sm:inline">Student</span>
        </Link>
      </header>

      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8">
          <div className="h-12 w-12 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
            </svg>
          </div>
          <h1 className="font-display font-extrabold text-[26px] text-[var(--color-ink)]">Admin Registration</h1>
          <p className="text-[15px] text-[var(--color-ink-muted)] mt-1">Create your Hostel Flow admin account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FieldWrap label="Full Name">
            <Input
              type="text"
              autoComplete="name"
              placeholder="e.g. Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FieldWrap>

          <FieldWrap label="Email">
            <Input
              type="email"
              autoComplete="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FieldWrap>

          <FieldWrap label="Admin Invite Code">
            <div className="relative">
              <Input
                type={showInviteCode ? 'text' : 'password'}
                autoComplete="off"
                placeholder="Enter admin invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowInviteCode(!showInviteCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors p-1"
                aria-label={showInviteCode ? 'Hide invite code' : 'Show invite code'}
              >
                {showInviteCode ? 'Hide' : 'Show'}
              </button>
            </div>
          </FieldWrap>

          <FieldWrap label="Password">
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

          <FieldWrap label="Confirm Password">
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirm password"
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
            <p role="alert" className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-[var(--radius-sm)] px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth loading={loading}>
            Sign up as Admin
          </Button>

          <div className="text-center pt-2">
            <p className="text-sm text-[var(--color-ink-muted)]">
              Already have an account?{' '}
              <Link to="/login?role=admin" className="font-medium text-[var(--color-primary)] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
