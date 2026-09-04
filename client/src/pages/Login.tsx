import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, ApiError } from '../context/AuthContext';
import Button from '../components/Button';
import { Input, FieldWrap } from '../components/primitives';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
              placeholder="you@hostelflow.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FieldWrap>
          <FieldWrap label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FieldWrap>

          {error && (
            <p role="alert" className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-[var(--radius-sm)] px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth loading={loading}>
            Sign in
          </Button>
        </form>

        <div className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
          <p className="text-xs font-semibold text-[var(--color-ink-muted)] mb-1.5">Demo accounts</p>
          <p className="text-xs text-[var(--color-ink-muted)] font-mono-data">student: asha.rao@hostelflow.app</p>
          <p className="text-xs text-[var(--color-ink-muted)] font-mono-data">admin: admin@hostelflow.app</p>
          <p className="text-xs text-[var(--color-ink-muted)] font-mono-data">password: password123</p>
        </div>
      </div>
    </div>
  );
}
