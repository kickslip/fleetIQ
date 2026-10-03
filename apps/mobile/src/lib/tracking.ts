// GPS tracking: foreground watcher (works in Expo Go) + background task
// (works in a dev build). Fixes are queued in AsyncStorage when offline
// and flushed on the next successful post — SA coverage gaps are real.
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, getSession } from './api';

export const LOCATION_TASK = 'fleet-background-location';
const QUEUE_KEY = 'position_queue';
const DUTY_KEY = 'on_duty';

let foregroundSub: Location.LocationSubscription | null = null;

async function queuePosition(p: any) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const q = raw ? JSON.parse(raw) : [];
  q.push(p);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-500)));
}

export async function flushQueue(): Promise<number> {
  const session = await getSession();
  if (!session?.vehicleId) return 0;
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const q = raw ? JSON.parse(raw) : [];
  if (!q.length) return 0;
  const base = await getApiUrl();
  try {
    const res = await fetch(`${base}/api/positions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ positions: q }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await AsyncStorage.setItem(QUEUE_KEY, '[]');
    return q.length;
  } catch {
    return -1; // still offline — keep queue
  }
}

export async function reportLocation(loc: Location.LocationObject) {
  const session = await getSession();
  if (!session?.vehicleId) return;
  const p = {
    vehicle_id: session.vehicleId,
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    speed: loc.coords.speed != null && loc.coords.speed >= 0 ? loc.coords.speed * 3.6 : 0,
    heading: loc.coords.heading ?? 0,
    recorded_at: new Date(loc.timestamp).toISOString(),
  };
  const sent = await flushSingle(p);
  if (!sent) await queuePosition(p);
}

async function flushSingle(p: any): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  const base = await getApiUrl();
  try {
    const res = await fetch(`${base}/api/positions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ positions: [p] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Background task — must be defined at module top level.
// Wrapped in try/catch: TaskManager is unavailable inside Expo Go on Android.
try {
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }: any) => {
  if (error) return;
  const { locations } = data ?? {};
  if (locations?.length) {
    for (const loc of locations) await reportLocation(loc);
  }
});
} catch {
  // TaskManager unavailable (Expo Go) — foreground tracking still works.
}

export async function startTracking() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) throw new Error('Location permission denied');
  await AsyncStorage.setItem(DUTY_KEY, '1');

  // Foreground watcher — also drives the map in Expo Go
  foregroundSub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 15000,      // ~15 s pings
      distanceInterval: 25,     // or every 25 m moved
    },
    (loc) => { void reportLocation(loc); }
  );

  // Background updates — works in a dev build, silently skipped in Expo Go
  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.granted && (await TaskManager.isAvailableAsync())) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000,
        distanceInterval: 50,
        foregroundService: {
          notificationTitle: 'FleetIQ Driver',
          notificationBody: 'Tracking is on — you are on duty',
        },
      });
    }
  } catch {
    // background unsupported in this runtime — foreground tracking continues
  }
}

export async function stopTracking() {
  foregroundSub?.remove();
  foregroundSub = null;
  await AsyncStorage.setItem(DUTY_KEY, '0');
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch {}
}

export async function isOnDuty() {
  return (await AsyncStorage.getItem(DUTY_KEY)) === '1';
}
