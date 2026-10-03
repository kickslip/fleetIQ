import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { getApiUrl, setApiUrl, login, getSession } from '../lib/api';

export default function LoginScreen() {
  const [server, setServer] = useState('');
  const [email, setEmail] = useState('sipho@fleet.demo');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getApiUrl().then(setServer);
    getSession().then((s) => { if (s) router.replace('/'); });
  }, []);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await setApiUrl(server.trim());
      await login(email.trim().toLowerCase(), password);
      router.replace('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.card}>
        <Text style={s.logo}>Fleet<Text style={{ color: '#38bdf8' }}>IQ</Text> Driver</Text>
        <Text style={s.sub}>Sign in to receive jobs</Text>

        <Text style={s.label}>Server</Text>
        <TextInput style={s.input} value={server} onChangeText={setServer} autoCapitalize="none" keyboardType="url" placeholder="http://192.168.x.x:4000" placeholderTextColor="#64748b" />
        <Text style={s.hint}>Laptop + phone on same Wi-Fi → use laptop's LAN IP</Text>

        <Text style={s.label}>Email</Text>
        <TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

        <Text style={s.label}>Password</Text>
        <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry />

        {!!error && <Text style={s.error}>{error}</Text>}

        <TouchableOpacity style={s.btn} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign in</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0b1220', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#111a2e', borderRadius: 16, padding: 24 },
  logo: { color: '#e2e8f0', fontSize: 26, fontWeight: '800' },
  sub: { color: '#94a3b8', marginTop: 4, marginBottom: 20 },
  label: { color: '#94a3b8', fontSize: 12, marginBottom: 4, marginTop: 10 },
  hint: { color: '#475569', fontSize: 10, marginTop: 3 },
  input: { backgroundColor: '#0d1626', borderColor: '#1e2a44', borderWidth: 1, borderRadius: 10, padding: 12, color: '#e2e8f0' },
  error: { color: '#f87171', marginTop: 12 },
  btn: { backgroundColor: '#0284c7', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: '700' },
});
