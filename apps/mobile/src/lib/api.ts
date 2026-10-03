import AsyncStorage from '@react-native-async-storage/async-storage';

// Default: Android emulator reaches the host via 10.0.2.2.
// On a physical phone, set this to your laptop's LAN IP on the login screen.
const DEFAULT_API = 'http://10.0.2.2:4000';

export async function getApiUrl(): Promise<string> {
  return (await AsyncStorage.getItem('api_url')) ?? DEFAULT_API;
}

export async function setApiUrl(url: string) {
  await AsyncStorage.setItem('api_url', url.replace(/\/$/, ''));
}

export async function getToken() {
  return AsyncStorage.getItem('token');
}

export async function getSession() {
  const raw = await AsyncStorage.getItem('session');
  return raw ? JSON.parse(raw) : null;
}

export async function saveSession(token: string, user: any, vehicleId: number | null) {
  await AsyncStorage.setItem('session', JSON.stringify({ token, user, vehicleId }));
}

export async function clearSession() {
  await AsyncStorage.multiRemove(['session', 'token']);
}

export async function login(email: string, password: string) {
  const base = await getApiUrl();
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Login failed');

  // Find which vehicle this driver is assigned to
  let vehicleId: number | null = null;
  const drv = await fetch(`${base}/api/drivers`, {
    headers: { authorization: `Bearer ${data.token}` },
  }).then((r) => r.json()).catch(() => []);
  const me = drv.find?.((d: any) => d.id === data.user.id);
  vehicleId = me?.vehicle_id ?? null;

  await AsyncStorage.setItem('token', data.token);
  await saveSession(data.token, data.user, vehicleId);
  return { user: data.user, vehicleId };
}

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const base = await getApiUrl();
  const token = await getToken();
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      ...(opts.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      authorization: `Bearer ${token}`,
      ...opts.headers,
    },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
  return res.json();
}
