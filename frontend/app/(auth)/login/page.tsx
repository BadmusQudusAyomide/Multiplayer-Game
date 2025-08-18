"use client";
import { useState } from 'react';
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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full rounded border p-3" placeholder="Email or Username" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
        <input className="w-full rounded border p-3" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded bg-blue-600 p-3 text-white disabled:opacity-50">{loading? 'Logging in...' : 'Login'}</button>
      </form>
    </div>
  );
}
