import { Tabs } from 'expo-router';

import { unreadBadgeLabel } from '@/features/notifications/domain/notification-rules';
import { useUnreadCount } from '@/features/notifications/presentation/use-notifications';
import { useTheme } from '@/shared/theme/theme-provider';
import { fontFamily } from '@/shared/theme/tokens';
import { BellIcon, HouseIcon, ListIcon } from '@/shared/ui/icons';

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
 * Thanh tab dưới (tối đa 5 mục). Hiện có: Trang chủ, Thông báo (kèm số chưa đọc), Menu.
 * Các đợt sau thêm Khóa huấn luyện và Quét QR theo quyền.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const unread = useUnreadCount();
  const badge = unreadBadgeLabel(unread.data);

  return (
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
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => tabIcon(HouseIcon, color, focused),
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
  );
}
