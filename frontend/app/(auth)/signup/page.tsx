"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/store/useAuth';
import { updateAllSocketAuth } from '@/src/lib/socket';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
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
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
      if (!base) throw new Error('API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL');
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000); // 15s timeout for cold starts
      const res = await fetch(`${base}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Signup failed');
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
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="mt-1 text-sm text-purple-200">Join and start playing</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm text-purple-200">Email</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white placeholder-purple-200/60 outline-none focus:ring-2 focus:ring-purple-400/60"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              inputMode="email"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-purple-200">Username</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white placeholder-purple-200/60 outline-none focus:ring-2 focus:ring-purple-400/60"
              placeholder="yourname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
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
              autoComplete="new-password"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 p-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-purple-200">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-white underline-offset-4 hover:underline">Login</Link>
        </p>
        </div>
      </div>
    </div>
  );
}
