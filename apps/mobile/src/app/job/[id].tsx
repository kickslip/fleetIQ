import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, TextInput, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import SignatureCanvas from 'react-native-signature-canvas';
import { api, getApiUrl, getToken } from '../../lib/api';
import { reportLocation } from '../../lib/tracking';
import * as Location from 'expo-location';

const NEXT: Record<string, { label: string; to: string } | undefined> = {
  assigned: { label: 'Accept job', to: 'accepted' },
  accepted: { label: 'Start route', to: 'en_route' },
  en_route: { label: 'Arrived at destination', to: 'arrived' },
};

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [sigUri, setSigUri] = useState<string | null>(null);
  const [sigOpen, setSigOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const sigRef = useRef<any>(null);

  async function load() {
    const jobs = await api<any[]>('/api/jobs').catch(() => []);
    setJob(jobs.find((j: any) => j.id === Number(id)) ?? null);
  }
  useEffect(() => { void load(); }, [id]);

  async function setStatus(to: string) {
    setBusy(true);
    setJob(await api(`/api/jobs/${id}/status`, { method: 'POST', body: JSON.stringify({ status: to }) }));
    setBusy(false);
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!r.canceled && r.assets[0]) setPhoto(r.assets[0].uri);
  }

  async function submitPod() {
    setBusy(true);
    try {
      const fd = new FormData();
      if (photo) fd.append('photo', { uri: photo, name: 'pod.jpg', type: 'image/jpeg' } as any);
      if (sigUri) fd.append('signature', { uri: sigUri, name: 'sig.png', type: 'image/png' } as any);
      if (notes) fd.append('notes', notes);
      const base = await getApiUrl();
      const res = await fetch(`${base}/api/jobs/${id}/pod`, {
        method: 'POST',
        headers: { authorization: `Bearer ${await getToken()}` },
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      // Final location ping so the completed job is geo-stamped
      const loc = await Location.getLastKnownPositionAsync();
      if (loc) await reportLocation(loc);
      router.back();
    } finally {
      setBusy(false);
    }
  }

  if (!job) return <View style={s.wrap}><ActivityIndicator color="#38bdf8" style={{ marginTop: 60 }} /></View>;
  const next = NEXT[job.status];

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.ref}>{job.ref}</Text>
      <Text style={s.title}>{job.title}</Text>
      {!!job.description && <Text style={s.desc}>{job.description}</Text>}

      <View style={s.card}>
        <Text style={s.cardLabel}>PICKUP</Text>
        <Text style={s.cardText}>{job.pickup_address}</Text>
        <Text style={[s.cardLabel, { marginTop: 10 }]}>DROP-OFF</Text>
        <Text style={s.cardText}>{job.dropoff_address}</Text>
        <Text style={[s.cardLabel, { marginTop: 10 }]}>STATUS</Text>
        <Text style={[s.cardText, { textTransform: 'capitalize' }]}>{job.status.replace('_', ' ')}</Text>
      </View>

      {next && (
        <TouchableOpacity style={s.primary} onPress={() => setStatus(next.to)} disabled={busy}>
          <Text style={s.primaryText}>{next.label}</Text>
        </TouchableOpacity>
      )}

      {job.status === 'arrived' && (
        <View style={s.card}>
          <Text style={s.section}>Proof of delivery</Text>
          <TouchableOpacity style={s.secondary} onPress={takePhoto}>
            <Text style={s.secondaryText}>{photo ? 'Retake photo' : 'Take delivery photo'}</Text>
          </TouchableOpacity>
          {photo && <Image source={{ uri: photo }} style={s.photo} />}
          <TouchableOpacity style={s.secondary} onPress={() => setSigOpen(true)}>
            <Text style={s.secondaryText}>{sigUri ? 'Signature captured ✓ — redo' : 'Capture signature'}</Text>
          </TouchableOpacity>
          {sigUri && <Image source={{ uri: sigUri }} style={s.sig} />}
          <TextInput style={s.notes} placeholder="Delivery notes (optional)" placeholderTextColor="#64748b"
            value={notes} onChangeText={setNotes} multiline />
          <TouchableOpacity style={[s.primary, { backgroundColor: '#059669' }]} onPress={submitPod} disabled={busy || !photo}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Complete delivery</Text>}
          </TouchableOpacity>
          {!photo && <Text style={s.hint}>Photo required for POD</Text>}
        </View>
      )}

      {job.status === 'completed' && (
        <View style={[s.card, { borderColor: '#059669' }]}>
          <Text style={{ color: '#34d399', fontWeight: '700' }}>✓ Delivered — POD submitted</Text>
        </View>
      )}

      <Modal visible={sigOpen} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#0b1220' }}>
          <Text style={[s.section, { padding: 16 }]}>Recipient signature</Text>
          <SignatureCanvas
            ref={sigRef}
            onOK={async (b64: string) => {
              const uri = `${FileSystem.cacheDirectory}sig-${Date.now()}.png`;
              await FileSystem.writeAsStringAsync(uri, b64.split(',')[1], { encoding: 'base64' });
              setSigUri(uri);
              setSigOpen(false);
            }}
            descriptionText="Sign here"
            webStyle=".m-signature-pad--footer {display:none} body {background:#111a2e}"
          />
          <TouchableOpacity style={s.secondary} onPress={() => setSigOpen(false)}>
            <Text style={s.secondaryText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0b1220' },
  ref: { color: '#38bdf8', fontSize: 12 },
  title: { color: '#e2e8f0', fontSize: 22, fontWeight: '800', marginTop: 2 },
  desc: { color: '#94a3b8', marginTop: 6 },
  card: { backgroundColor: '#111a2e', borderRadius: 12, padding: 14, marginTop: 14, borderWidth: 1, borderColor: '#1e2a44' },
  cardLabel: { color: '#64748b', fontSize: 10, letterSpacing: 1 },
  cardText: { color: '#e2e8f0', fontSize: 14, marginTop: 2 },
  section: { color: '#e2e8f0', fontWeight: '700', fontSize: 15, marginBottom: 10 },
  primary: { backgroundColor: '#0284c7', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 14 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: { backgroundColor: '#1e2a44', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 10 },
  secondaryText: { color: '#cbd5e1', fontWeight: '600', fontSize: 13 },
  photo: { width: '100%', height: 200, borderRadius: 10, marginTop: 10 },
  sig: { width: '100%', height: 120, borderRadius: 10, marginTop: 10, backgroundColor: '#fff' },
  notes: { backgroundColor: '#0d1626', borderColor: '#1e2a44', borderWidth: 1, borderRadius: 10, padding: 12, color: '#e2e8f0', marginTop: 10, minHeight: 60 },
  hint: { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 6 },
});
