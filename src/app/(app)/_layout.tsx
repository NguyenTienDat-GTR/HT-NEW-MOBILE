import { Stack } from 'expo-router';

/** Khu vực sau đăng nhập. Các đợt sau thay Stack này bằng thanh tab (Tổng quan, Khóa huấn luyện, Quét QR, Thông báo, Menu). */
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
