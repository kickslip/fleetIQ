'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@fleet.demo');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login failed');
      localStorage.setItem('fleet_token', data.token);
      localStorage.setItem('fleet_user', JSON.stringify(data.user));
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8">
        <div>
          <div className="text-2xl font-bold">Fleet<span className="text-sky-400">IQ</span></div>
          <p className="mt-1 text-sm text-slate-400">Sign in to the operations portal</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Email</label>
          <input className="w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Password</label>
          <input className="w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-sky-600 py-2 text-sm font-semibold hover:bg-sky-500 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Demo logins — admin@fleet.demo · dispatch@fleet.demo (password: demo123)
        </p>
      </form>
    </div>
  );
}
