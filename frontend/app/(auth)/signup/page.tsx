"use client";
import { useState } from 'react';
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Sign up</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full rounded border p-3" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full rounded border p-3" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
        <input className="w-full rounded border p-3" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded bg-emerald-600 p-3 text-white disabled:opacity-50">{loading? 'Creating...' : 'Create account'}</button>
      </form>
    </div>
  );
}
