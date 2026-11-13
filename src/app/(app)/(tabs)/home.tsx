import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { useLogout } from '@/features/auth/presentation/use-session';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

/** Màn tạm của đợt 1: xác nhận đăng nhập thành công. Được thay bằng Tổng quan ở đợt 3. */
export default function HomeRoute() {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  return (
    <Screen footer={<Button label="Đăng xuất" variant="outline" onPress={() => void logout()} />}>
      <BrandHeader compact />
      <Text variant="title">Xin chào, {user?.username}</Text>
      {user?.unitLocked ? (
        <Banner tone="warning" message="Đơn vị của bạn đang bị khóa. Bạn chỉ xem được thông báo." />
      ) : null}
      <Text variant="secondary" tone="textSecondary">
        Bạn có {user?.permissions.length ?? 0} quyền. Các màn hình nghiệp vụ sẽ được bổ sung ở các
        đợt tiếp theo.
      </Text>
    </Screen>
  );
}
