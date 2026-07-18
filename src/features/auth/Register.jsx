import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, ErrorMessage } from '../../components/ui';

// Map raw Firebase auth codes to user-friendly messages (frontend.md).
function mapAuthError(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'This email is already registered.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

const inputClass =
  'h-9 w-full px-3 text-sm text-ink-950 bg-white border border-ink-300 rounded ' +
  'placeholder:text-ink-500 focus:outline-none focus:border-accent focus:ring-1 ' +
  'focus:ring-accent transition-colors';

export function Register() {
  const { registerWithEmail } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerWithEmail(email, password);
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
          Create your account
        </h1>
        <p className="text-sm text-ink-500 text-center mt-1">
          Start your daily current-affairs prep
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mt-1 ${inputClass}`}
              placeholder="At least 6 characters"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            Create account
          </Button>
        </form>

        <p className="text-sm text-ink-500 text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-ink-950 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
