"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/store/useAuth';
import { updateAllSocketAuth } from '@/src/lib/socket';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setToken = useAuth((s) => s.setToken);
  const router = useRouter();
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // send as both email and username so backend can match either
        body: JSON.stringify({ email: identifier, username: identifier, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Login failed');
      }
      const data = await res.json();
      setToken(data.token);
      updateAllSocketAuth(data.token);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="mx-auto w-full max-w-sm py-8">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-md text-white shadow-xl">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-purple-200">Log in to continue</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm text-purple-200">Email or Username</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white placeholder-purple-200/60 outline-none focus:ring-2 focus:ring-purple-400/60"
              placeholder="you@example.com or yourname"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              inputMode="email"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-purple-200">Password</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white placeholder-purple-200/60 outline-none focus:ring-2 focus:ring-purple-400/60"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 p-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-purple-200">
          New here?{' '}
          <Link href="/signup" className="font-semibold text-white underline-offset-4 hover:underline">Create an account</Link>
        </p>
        </div>
      </div>
    </div>
  );
}
