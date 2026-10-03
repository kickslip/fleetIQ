import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Switch } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api, getSession, clearSession } from '../lib/api';
import { startTracking, stopTracking, isOnDuty, flushQueue } from '../lib/tracking';

const STATUS_COLORS: Record<string, string> = {
  assigned: '#0284c7', accepted: '#4f46e5', en_route: '#d97706',
  arrived: '#7c3aed', completed: '#059669', pending: '#475569', cancelled: '#dc2626',
};

export default function JobsScreen() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [onDuty, setOnDuty] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [queued, setQueued] = useState<number | null>(null);

  async function load() {
    const s = await getSession();
    setSession(s);
    if (!s) return router.replace('/login');
    const j = await api<any[]>(`/api/jobs?driver_id=${s.user.id}`).catch(() => []);
    setJobs(j);
    setOnDuty(await isOnDuty());
    const n = await flushQueue();
    setQueued(n >= 0 ? 0 : queued);
  }

  useFocusEffect(useCallback(() => { void load(); }, []));

  async function toggleDuty(v: boolean) {
    setOnDuty(v);
    if (v) {
      try { await startTracking(); } catch { setOnDuty(false); }
    } else {
      await stopTracking();
    }
  }

  return (
    <View style={s.wrap}>
      <View style={s.dutyCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.dutyTitle}>{onDuty ? 'On duty — GPS tracking ON' : 'Off duty — tracking paused'}</Text>
          <Text style={s.dutySub}>
            {session?.vehicleId ? `Vehicle #${session.vehicleId}` : 'No vehicle assigned'}
            {queued ? ` · ${queued} fixes queued` : ''}
          </Text>
        </View>
        <Switch value={onDuty} onValueChange={toggleDuty} trackColor={{ true: '#059669' }} />
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(j) => String(j.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<Text style={s.empty}>No jobs assigned to you yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.job} onPress={() => router.push(`/job/${item.id}`)}>
            <View style={{ flex: 1 }}>
              <Text style={s.jobRef}>{item.ref}</Text>
              <Text style={s.jobTitle}>{item.title}</Text>
              <Text style={s.jobAddr}>{item.pickup_address} → {item.dropoff_address}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: STATUS_COLORS[item.status] ?? '#475569' }]}>
              <Text style={s.badgeText}>{item.status.replace('_', ' ')}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={s.logout} onPress={async () => { await stopTracking(); await clearSession(); router.replace('/login'); }}>
        <Text style={{ color: '#f87171', fontSize: 13 }}>Sign out ({session?.user?.name})</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0b1220', padding: 16 },
  dutyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111a2e', borderRadius: 12, padding: 14, marginBottom: 14 },
  dutyTitle: { color: '#e2e8f0', fontWeight: '700', fontSize: 14 },
  dutySub: { color: '#64748b', fontSize: 11, marginTop: 2 },
  job: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111a2e', borderRadius: 12, padding: 14, marginBottom: 10 },
  jobRef: { color: '#38bdf8', fontSize: 11, fontFamily: 'monospace' as any },
  jobTitle: { color: '#e2e8f0', fontWeight: '700', fontSize: 15, marginTop: 2 },
  jobAddr: { color: '#94a3b8', fontSize: 12, marginTop: 3 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 60 },
  logout: { alignItems: 'center', paddingVertical: 10 },
});
