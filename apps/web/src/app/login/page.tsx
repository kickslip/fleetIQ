'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="orb bg-primary/25 w-[460px] h-[460px] top-[-160px] right-[-80px]" />
      <div className="orb bg-cyan/15 w-[380px] h-[380px] bottom-[-140px] left-[-60px]" />

      <form onSubmit={submit} className="glass border-flow relative z-10 w-full max-w-sm rounded-[2rem] p-9 space-y-5">
        <div>
          <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center mb-5">
            <Icon icon="solar:radar-bold-duotone" className="text-2xl text-primary" />
          </div>
          <div className="text-2xl font-bold tracking-tight">Fleet<span className="text-primary">IQ</span></div>
          <p className="mt-1.5 text-sm text-muted">Sign in to the operations portal</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted">Email</label>
          <input className="w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted">Password</label>
          <input className="w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-pink">{error}</p>}
        <button
          disabled={loading}
          className="liquid-btn glass border-flow w-full rounded-full py-3 text-sm font-semibold hover:scale-[1.02] transition disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-[11px] leading-relaxed text-muted">
          Demo logins — admin@fleet.demo · dispatch@fleet.demo (password: demo123)
        </p>
      </form>
    </div>
  );
}
