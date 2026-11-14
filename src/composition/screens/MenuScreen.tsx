import Constants from 'expo-constants';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { hasPermissionPrefix, isSuperAdmin } from '@/core/domain/permissions';
import { useAuthDependencies } from '@/features/auth/presentation/auth-context';
import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { useLogout } from '@/features/auth/presentation/use-session';
import { displayName, primaryRoleName } from '@/features/account/domain/labels';
import { useTheme } from '@/shared/theme/theme-provider';
import { AccordionGroup } from '@/shared/ui/AccordionGroup';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { ConfirmSheet } from '@/shared/ui/ConfirmSheet';
import {
  BuildingsIcon,
  CertificateIcon,
  GearSixIcon,
  GraduationCapIcon,
  ChartLineUpIcon,
  UsersThreeIcon,
  KeyIcon,
  LockKeyIcon,
  ShieldCheckIcon,
  SignOutIcon,
  UserCircleIcon,
} from '@/shared/ui/icons';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { visibleMenuSections, type MenuGroupId } from '../menu-entries';
import { Text } from '@/shared/ui/Text';

export interface MenuScreenProps {
  onNavigate: (path: string) => void;
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
  // Như web: xem phân tích chi tiết khi có quyền analytics.dashboard.read.* và không phải quản trị hệ thống.
  const canSeeAnalytics =
    !user?.unitLocked &&
    !isSuperAdmin(user) &&
    hasPermissionPrefix(user, 'analytics.dashboard.read.');
  const sections = visibleMenuSections(user);
  const groupIcon: Record<MenuGroupId, typeof KeyIcon> = {
    organization: BuildingsIcon,
    leaders: UsersThreeIcon,
    'executive-board': ShieldCheckIcon,
    training: GraduationCapIcon,
    certificates: CertificateIcon,
    system: GearSixIcon,
  };
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

      {/* Như thanh bên của web: mỗi nhóm gập được, chạm tiêu đề để ẩn/hiện các mục bên trong. */}
      {sections.map((section) => (
        <AccordionGroup
          key={section.group}
          title={section.label}
          icon={icon(groupIcon[section.group])}
          count={section.entries.length}
        >
          {section.entries.map((entry) => (
            <ListRow
              key={entry.resource}
              label={entry.label}
              hint={entry.hint}
              onPress={() => onNavigate(`/res/${entry.resource}`)}
            />
          ))}
        </AccordionGroup>
      ))}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {canSeeAnalytics ? (
          <ListRow
            label="Phân tích dữ liệu"
            hint="Khóa huấn luyện, chứng nhận, huynh trưởng, tổ chức"
            icon={icon(ChartLineUpIcon)}
            onPress={() => onNavigate('/analytics')}
          />
        ) : null}
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
