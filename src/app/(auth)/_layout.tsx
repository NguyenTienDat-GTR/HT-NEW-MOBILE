import { Stack } from 'expo-router';

/** Màn mặc định của nhóm chưa đăng nhập. */
export const unstable_settings = { anchor: 'login' };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
