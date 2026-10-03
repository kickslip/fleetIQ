'use client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';

export function getToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem('fleet_token');
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('fleet_user');
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem('fleet_token');
  localStorage.removeItem('fleet_user');
  window.location.href = '/login';
}

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      ...(opts.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      authorization: `Bearer ${getToken()}`,
      ...opts.headers,
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
  return res.json();
}
