import Constants from 'expo-constants';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { useAuthDependencies } from '@/features/auth/presentation/auth-context';
import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { useLogout } from '@/features/auth/presentation/use-session';
import { displayName, primaryRoleName } from '@/features/account/domain/labels';
import { useTheme } from '@/shared/theme/theme-provider';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { ConfirmSheet } from '@/shared/ui/ConfirmSheet';
import {
  KeyIcon,
  LockKeyIcon,
  ShieldCheckIcon,
  SignOutIcon,
  UserCircleIcon,
} from '@/shared/ui/icons';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

export interface MenuScreenProps {
  onNavigate: (path: '/profile' | '/my-permissions' | '/account-password') => void;
}

/**
 * Tab "Menu": hồ sơ, quyền, đổi mật khẩu, chính sách, đăng xuất. Các nhóm chức năng nghiệp vụ
 * (tổ chức, huynh trưởng, huấn luyện…) được thêm vào đây theo quyền ở các đợt sau.
 */
export function MenuScreen({ onNavigate }: MenuScreenProps) {
  const { colors, iconSize, spacing } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { siteOrigin } = useAuthDependencies();
  const logout = useLogout();
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const name = displayName(undefined, user?.username ?? '');
  const icon = (Icon: typeof KeyIcon) => (
    <Icon size={iconSize.md} color={colors.primary} weight="bold" />
  );

  async function confirmLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setConfirming(false);
    }
  }

  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">
        Menu
      </Text>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar name={name} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="heading" numberOfLines={1}>
              {name}
            </Text>
            <Badge label={primaryRoleName(undefined, user?.roles ?? [])} tone="info" />
          </View>
        </View>
      </Card>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <ListRow
          label="Hồ sơ cá nhân"
          icon={icon(UserCircleIcon)}
          onPress={() => onNavigate('/profile')}
        />
        <ListRow
          label="Quyền của tôi"
          icon={icon(KeyIcon)}
          onPress={() => onNavigate('/my-permissions')}
        />
        <ListRow
          label="Đổi mật khẩu"
          icon={icon(LockKeyIcon)}
          onPress={() => onNavigate('/account-password')}
        />
        <ListRow
          label="Chính sách bảo vệ dữ liệu cá nhân"
          icon={icon(ShieldCheckIcon)}
          onPress={() => void Linking.openURL(`${siteOrigin}/chinh-sach-bao-mat`)}
        />
      </Card>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <ListRow
          label="Đăng xuất"
          destructive
          showChevron={false}
          icon={<SignOutIcon size={iconSize.md} color={colors.danger} weight="bold" />}
          onPress={() => setConfirming(true)}
        />
      </Card>

      <Text variant="secondary" tone="muted" align="center">
        C-LEAD {Constants.expoConfig?.version ?? ''}
      </Text>

      <ConfirmSheet
        visible={confirming}
        title="Đăng xuất?"
        message="Bạn sẽ ngừng nhận thông báo trên máy này cho tới khi đăng nhập lại."
        confirmLabel="Đăng xuất"
        destructive
        loading={loggingOut}
        onConfirm={() => void confirmLogout()}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}
