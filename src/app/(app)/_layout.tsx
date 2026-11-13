import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { PushTapNavigator } from '@/composition/PushTapNavigator';
import { useAuthEventsSync } from '@/features/auth/presentation/use-session';
import {
  useAppBadgeSync,
  useNotificationRealtime,
  usePushRegistration,
  useUnreadCount,
} from '@/features/notifications/presentation/use-notifications';
import { useRealtime } from '@/shared/realtime/realtime-context';
import { useTheme } from '@/shared/theme/theme-provider';
import { fontFamily } from '@/shared/theme/tokens';

/** Việc chạy nền suốt thời gian đã đăng nhập: kênh realtime, đăng ký push, số trên icon app, điều hướng khi bấm push. */
function AppEffects() {
  const realtime = useRealtime();
  useEffect(() => {
    realtime.connect();
    return () => realtime.disconnect();
  }, [realtime]);

  useNotificationRealtime();
  useAuthEventsSync();
  usePushRegistration(true);
  const unread = useUnreadCount();
  useAppBadgeSync(unread.data);
  return Platform.OS === 'web' ? null : <PushTapNavigator />;
}

/** Khu vực sau đăng nhập: thanh tab ở `(tabs)`, các màn đẩy lên có thanh tiêu đề và nút quay lại. */
export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <>
      <AppEffects />
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface1 },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontFamily: fontFamily.semibold, color: colors.foreground },
          headerShadowVisible: false,
          headerBackTitle: '',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="analytics" options={{ title: 'Phân tích dữ liệu' }} />
        <Stack.Screen name="profile" options={{ title: 'Hồ sơ cá nhân' }} />
        <Stack.Screen name="my-permissions" options={{ title: 'Quyền của tôi' }} />
        <Stack.Screen name="change-email" options={{ title: 'Đổi email' }} />
        <Stack.Screen name="account-password" options={{ title: 'Đổi mật khẩu' }} />
      </Stack>
    </>
  );
}
