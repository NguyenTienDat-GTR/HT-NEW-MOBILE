import { Tabs } from 'expo-router';

import { canSeeMenuEntry } from '@/composition/menu-entries';
import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { canUseQrScanner } from '@/features/training/domain/training-permissions';
import { unreadBadgeLabel } from '@/features/notifications/domain/notification-rules';
import { useUnreadCount } from '@/features/notifications/presentation/use-notifications';
import { useTheme } from '@/shared/theme/theme-provider';
import { fontFamily } from '@/shared/theme/tokens';
import { ScreenInsets } from '@/shared/ui/screen-insets';
import { BellIcon, GraduationCapIcon, HouseIcon, ListIcon } from '@/shared/ui/icons';
import { ScanTabButton } from '@/shared/ui/ScanTabButton';

type IconComponent = typeof HouseIcon;

/** Icon tab: nét đậm; tab đang chọn tô đặc (fill). `color` do thanh tab truyền vào. */
function tabIcon(Icon: IconComponent, color: unknown, focused: boolean) {
  return (
    <Icon
      size={24}
      color={typeof color === 'string' ? color : undefined}
      weight={focused ? 'fill' : 'bold'}
    />
  );
}

/**
 * Thanh tab dưới (tối đa 5 mục). Hiện có: Tổng quan, Thông báo (kèm số chưa đọc), Menu.
 * Các đợt sau thêm Khóa huấn luyện và Quét QR theo quyền.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const unread = useUnreadCount();
  const badge = unreadBadgeLabel(unread.data);
  const user = useAuthStore((state) => state.user);
  // Tab chỉ hiện khi người dùng có quyền (href: null = ẩn khỏi thanh tab, route vẫn tồn tại).
  const showCourses = canSeeMenuEntry('courses', user);
  const showScan = canUseQrScanner(user);

  return (
    // Thanh tab dưới đã chừa phía dưới; màn trong tab chỉ chừa phía trên (không có thanh tiêu đề).
    <ScreenInsets top bottom={false}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: { backgroundColor: colors.surface1, borderTopColor: colors.border },
          tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 12 },
          tabBarBadgeStyle: { backgroundColor: colors.danger, color: colors.onSolid },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Tổng quan',
            tabBarIcon: ({ color, focused }) => tabIcon(HouseIcon, color, focused),
          }}
        />
        <Tabs.Screen
          name="courses"
          options={{
            title: 'Khóa huấn luyện',
            tabBarLabel: 'Khóa HL',
            href: showCourses ? undefined : null,
            // Có thanh tiêu đề riêng (danh sách khóa không tự vẽ tiêu đề).
            headerShown: true,
            headerStyle: { backgroundColor: colors.surface1 },
            headerTitleStyle: { fontFamily: fontFamily.semibold, color: colors.foreground },
            headerShadowVisible: false,
            tabBarAccessibilityLabel: 'Khóa huấn luyện',
            tabBarIcon: ({ color, focused }) => tabIcon(GraduationCapIcon, color, focused),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Quét mã QR',
            // Ẩn theo quyền bằng `hidden` (không dùng `href`: expo-router cấm dùng `href` cùng `tabBarButton`).
            hidden: !showScan,
            // Nút nổi ở giữa; chọn thì mở màn quét và bật camera.
            tabBarButton: (props) => <ScanTabButton {...props} />,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Thông báo',
            tabBarBadge: badge ?? undefined,
            tabBarAccessibilityLabel: badge ? `Thông báo, ${badge} chưa đọc` : 'Thông báo',
            tabBarIcon: ({ color, focused }) => tabIcon(BellIcon, color, focused),
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: 'Menu',
            tabBarIcon: ({ color, focused }) => tabIcon(ListIcon, color, focused),
          }}
        />
      </Tabs>
    </ScreenInsets>
  );
}
