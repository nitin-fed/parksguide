import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { TripsProvider } from '../state/trips';
import { useTheme } from '../theme';

export default function RootLayout() {
  const c = useTheme();
  return (
    <TripsProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerTintColor: c.primary,
          headerStyle: { backgroundColor: c.background },
          headerTitleStyle: { color: c.text },
          contentStyle: { backgroundColor: c.background },
        }}
      >
        {/* title is what iOS shows as the back label on pushed screens; without it you get "(tabs)". */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Back' }} />
        <Stack.Screen name="park/[code]" options={{ title: '' }} />
        <Stack.Screen name="trip/[id]" options={{ title: 'Trip' }} />
        <Stack.Screen name="chat/[tripId]" options={{ title: 'Chat', presentation: 'modal' }} />
      </Stack>
    </TripsProvider>
  );
}
