import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0b1220' },
        headerTintColor: '#e2e8f0',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ title: 'My Jobs', headerBackVisible: false }} />
      <Stack.Screen name="job/[id]" options={{ title: 'Job Detail' }} />
    </Stack>
  );
}
