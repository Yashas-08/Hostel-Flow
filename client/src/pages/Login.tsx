import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, ApiError } from '../context/AuthContext';
import Button from '../components/Button';
import { Input, FieldWrap } from '../components/primitives';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      const from = (location.state as { from?: string })?.from;
      const dest = from || (user.role === 'admin' ? '/admin' : '/student');
      navigate(dest, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-9">
          <div className="h-12 w-12 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
            </svg>
          </div>
          <h1 className="font-display font-extrabold text-[26px] text-[var(--color-ink)]">Hostel Flow</h1>
          <p className="text-[15px] text-[var(--color-ink-muted)] mt-1">Sign in to manage your hostel life.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FieldWrap label="Email">
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FieldWrap>

          <FieldWrap label="Password">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
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

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {error && (
            <p role="alert" className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-[var(--radius-sm)] px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth loading={loading}>
            Sign in
          </Button>

          <div className="text-center pt-2">
            <p className="text-sm text-[var(--color-ink-muted)]">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-[var(--color-primary)] hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}


