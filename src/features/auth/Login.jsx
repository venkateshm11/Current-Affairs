import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, ErrorMessage } from '../../components/ui';

// Map raw Firebase auth codes to user-friendly messages (frontend.md).
// Never surface raw Firebase error codes to the user.
function mapAuthError(code) {
  switch (code) {
    case 'auth/invalid-email':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

const inputClass =
  'h-9 w-full px-3 text-sm text-ink-950 bg-white border border-ink-300 rounded ' +
  'placeholder:text-ink-500 focus:outline-none focus:border-accent focus:ring-1 ' +
  'focus:ring-accent transition-colors';

export function Login() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      navigate('/');
    } catch (err) {
      setError(mapAuthError(err?.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      setError(mapAuthError(err?.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl text-ink-950 font-semibold tracking-tight text-center">
          Vaishu
        </h1>
        <p className="text-sm text-ink-500 text-center mt-1">
          Sign in to continue
        </p>

        <form onSubmit={handleEmailSubmit} className="mt-6 space-y-3">
          {error && <ErrorMessage message={error} />}

          <div>
            <label htmlFor="email" className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-1 ${inputClass}`}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-2xs text-ink-500 font-medium uppercase tracking-widest">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mt-1 ${inputClass}`}
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <span className="h-px flex-1 bg-ink-300" />
          <span className="text-2xs text-ink-500 uppercase tracking-widest">or</span>
          <span className="h-px flex-1 bg-ink-300" />
        </div>

        <Button
          variant="secondary"
          size="lg"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full"
        >
          Continue with Google
        </Button>

        <p className="text-sm text-ink-500 text-center mt-6">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-ink-950 font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
