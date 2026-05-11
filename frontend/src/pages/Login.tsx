import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/utils/errors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

export function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      setAuth(res.data.data.accessToken, res.data.data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Welcome back</h1>
        <p className="text-secondary mt-1 text-base">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <ErrorMessage message={error} />

        <Button type="submit" loading={loading} className="w-full mt-2">
          Sign in
        </Button>
      </form>

      <p className="text-center text-secondary text-sm mt-8">
        No account?{' '}
        <Link to="/register" className="text-accent font-semibold">
          Create one
        </Link>
      </p>
    </div>
  );
}
