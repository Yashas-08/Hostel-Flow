import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, ApiError } from '../context/AuthContext';
import Button from '../components/Button';
import { Input, FieldWrap } from '../components/primitives';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });
      // New student signups are routed directly to the student dashboard
      navigate('/student', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not create student account. Please try again.');
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
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
            </svg>
          </div>
          <h1 className="font-display font-extrabold text-[26px] text-[var(--color-ink)]">Student Registration</h1>
          <p className="text-[15px] text-[var(--color-ink-muted)] mt-1">Create your Hostel Flow student account.</p>
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
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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
            Sign up as Student
          </Button>

          <div className="text-center pt-2">
            <p className="text-sm text-[var(--color-ink-muted)]">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-[var(--color-primary)] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
