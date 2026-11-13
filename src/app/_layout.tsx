import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppProviders } from '@/composition/AppProviders';
import { useGateTarget } from '@/features/auth/presentation/use-gate-target';
import { useSessionBootstrap } from '@/features/auth/presentation/use-session';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

function RootNavigator() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  useSessionBootstrap();
  const target = useGateTarget();

  const resolved = (fontsLoaded || fontError !== null) && target !== 'loading';
  useEffect(() => {
    if (resolved) SplashScreen.hide();
  }, [resolved]);

  // Giữ màn khởi động gốc cho tới khi biết trạng thái phiên: không nháy màn đăng nhập.
  if (!resolved) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={target === 'login'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={target === 'unreachable'}>
          <Stack.Screen name="unreachable" />
        </Stack.Protected>
        <Stack.Protected guard={target === 'change-password'}>
          <Stack.Screen name="change-password" />
        </Stack.Protected>
        <Stack.Protected guard={target === 'privacy-consent'}>
          <Stack.Screen name="privacy-consent" />
        </Stack.Protected>
        <Stack.Protected guard={target === 'home'}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
