import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { formatDate } from '@/core/domain/date-format';
import { useTheme } from '@/shared/theme/theme-provider';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { InfoRow } from '@/shared/ui/InfoRow';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

import {
  approvalStatusLabel,
  displayName,
  genderLabel,
  leaderLevelName,
  primaryRoleName,
} from '../../domain/labels';
import { useMyProfile } from '../use-account-queries';

export interface ProfileScreenProps {
  /** Dự phòng khi hồ sơ chưa tải xong (lấy từ phiên đăng nhập). */
  username: string;
  roleCodes: readonly string[];
  onChangeEmail: () => void;
  onChangePassword: () => void;
}

/**
 * Hồ sơ cá nhân. Chỉ hiện thông tin chính (cấp, giáo xứ, giáo hạt); liên hệ, lịch sử cấp bậc và
 * chứng nhận nằm trong nhóm thu gọn để khỏi phải vuốt nhiều.
 */
export function ProfileScreen({
  username,
  roleCodes,
  onChangeEmail,
  onChangePassword,
}: ProfileScreenProps) {
  const { spacing } = useTheme();
  const query = useMyProfile();
  const profile = query.data;
  const leader = profile?.leader ?? null;
  const name = displayName(profile, username);

  return (
    <Screen>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar name={name} size={64} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="heading" numberOfLines={2}>
              {name}
            </Text>
            <Text variant="secondary" tone="muted">
              @{profile?.username ?? username}
            </Text>
            <Badge label={primaryRoleName(profile, roleCodes)} tone="info" />
          </View>
        </View>
      </Card>

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <Banner tone="danger" message={errorMessage(query.error)} /> : null}

      {leader ? (
        <Card>
          <View style={{ gap: spacing.sm }}>
            <Text variant="heading">Huynh trưởng</Text>
            <InfoRow label="Cấp huynh trưởng">
              <Badge label={leaderLevelName(leader.leaderLevel) || 'Chưa có cấp'} tone="info" />
            </InfoRow>
            <InfoRow label="Giáo xứ" value={leader.parishName} />
            <InfoRow label="Giáo hạt" value={leader.deaneryName} />
            <CollapsibleSection title="Thông tin liên hệ">
              <InfoRow label="Ngày sinh" value={formatDate(leader.birthDate)} />
              <InfoRow label="Giới tính" value={genderLabel(leader.gender)} />
              <InfoRow label="Số điện thoại" value={leader.phoneNumber} />
              <InfoRow label="Email" value={leader.email} />
            </CollapsibleSection>
            <CollapsibleSection title="Lịch sử cấp bậc" count={profile?.rankHistory.length ?? 0}>
              {(profile?.rankHistory ?? []).map((row, index) => (
                <InfoRow
                  key={`${row.promotionDate}-${index}`}
                  label={formatDate(row.promotionDate) || 'Chưa rõ ngày'}
                  value={`${leaderLevelName(row.oldLevel) || '—'} → ${leaderLevelName(row.newLevel) || '—'}${row.courseName ? ` (${row.courseName})` : ''}`}
                />
              ))}
              {(profile?.rankHistory.length ?? 0) === 0 ? (
                <Text variant="secondary" tone="muted">
                  Chưa có lịch sử thăng cấp.
                </Text>
              ) : null}
            </CollapsibleSection>
            <CollapsibleSection title="Chứng nhận" count={profile?.certificates.length ?? 0}>
              {(profile?.certificates ?? []).map((row) => {
                const status = approvalStatusLabel(row.approvalStatus);
                return (
                  <View key={row.certificateCode} style={{ gap: 4 }}>
                    <Text variant="bodyStrong">{row.courseName || row.certificateCode}</Text>
                    <Text variant="secondary" tone="muted">
                      {row.certificateCode}
                      {row.issueDate ? ` · ${formatDate(row.issueDate)}` : ''}
                    </Text>
                    <Badge label={status.label} tone={status.tone} />
                  </View>
                );
              })}
              {(profile?.certificates.length ?? 0) === 0 ? (
                <Text variant="secondary" tone="muted">
                  Chưa có chứng nhận.
                </Text>
              ) : null}
            </CollapsibleSection>
          </View>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: spacing.sm }}>
          <Text variant="heading">Tài khoản</Text>
          <InfoRow label="Email nhận thông tin" value={profile?.email} />
          <Button label="Đổi email" variant="outline" onPress={onChangeEmail} />
          <Button label="Đổi mật khẩu" variant="outline" onPress={onChangePassword} />
        </View>
      </Card>
    </Screen>
  );
}
