import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { useLogout } from '@/features/auth/presentation/use-session';
import { DashboardScreen } from '@/features/analytics/presentation/screens/DashboardScreen';
import { hasPermissionPrefix } from '@/core/domain/permissions';
import { dashboardHref } from '../dashboard-links';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

export interface HomeScreenProps {
  onOpenPath: (path: string) => void;
  onOpenAnalysis: () => void;
}

/** Quyền xem tổng quan (giống web: analytics.dashboard.read.* hoặc organization.*). */
export function canReadOverview(user: Parameters<typeof hasPermissionPrefix>[0]): boolean {
  return (
    hasPermissionPrefix(user, 'analytics.dashboard.read.') ||
    hasPermissionPrefix(user, 'organization.')
  );
}

/**
 * Tab "Tổng quan". Tài khoản có quyền thì thấy tổng quan theo phạm vi; tài khoản không có quyền
 * (huynh trưởng thường) thấy lời chào và lối tới thông báo/hồ sơ, không gọi API bị từ chối.
 */
export function HomeScreen({ onOpenPath, onOpenAnalysis }: HomeScreenProps) {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  if (canReadOverview(user)) {
    return (
      <DashboardScreen
        permissions={user?.permissions ?? []}
        resolveHref={(key, href) => dashboardHref(key, href, user)}
        onOpenPath={onOpenPath}
        onOpenAnalysis={onOpenAnalysis}
      />
    );
  }

  return (
    <Screen footer={<Button label="Đăng xuất" variant="outline" onPress={() => void logout()} />}>
      <BrandHeader compact />
      <Text variant="title">Xin chào, {user?.username}</Text>
      {user?.unitLocked ? (
        <Banner tone="warning" message="Đơn vị của bạn đang bị khóa. Bạn chỉ xem được thông báo." />
      ) : null}
      <Text variant="secondary" tone="textSecondary">
        Tài khoản của bạn chưa được cấp quyền xem số liệu tổng quan. Xem thông báo ở tab Thông báo
        và hồ sơ của bạn trong Menu.
      </Text>
    </Screen>
  );
}
