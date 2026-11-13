import { View } from 'react-native';

import { formatDateTime } from '@/core/domain/date-format';
import { useTheme } from '@/shared/theme/theme-provider';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Text } from '@/shared/ui/Text';

import type { NotificationItem } from '../../domain/entities';
import { notificationDetail } from '../../domain/notification-rules';

export interface NotificationDetailSheetProps {
  item: NotificationItem | null;
  /** Đường dẫn màn hình đích đã có trên mobile (null = chưa có, ẩn nút mở). */
  openPath: string | null;
  onOpen: (path: string) => void;
  onClose: () => void;
}

const DECISION_LABEL: Record<string, string> = {
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  REVOKED: 'Thu hồi',
};

/** Chi tiết thông báo: nội dung đầy đủ, danh sách gom nhóm (nếu có payload) và nút mở màn hình liên quan. */
export function NotificationDetailSheet({
  item,
  openPath,
  onOpen,
  onClose,
}: NotificationDetailSheetProps) {
  const { spacing } = useTheme();
  const detail = item ? notificationDetail(item) : null;

  return (
    <BottomSheet
      visible={item !== null}
      title={item?.title || 'Thông báo'}
      onClose={onClose}
      footer={
        openPath ? (
          <Button label="Mở màn hình liên quan" onPress={() => onOpen(openPath)} />
        ) : undefined
      }
    >
      {item ? (
        <>
          <Text variant="secondary" tone="muted">
            {formatDateTime(item.createdAt)}
          </Text>
          {item.message ? <Text variant="body">{item.message}</Text> : null}
          {detail ? (
            <View style={{ gap: spacing.sm }}>
              {detail.heading ? <Text variant="bodyStrong">{detail.heading}</Text> : null}
              {detail.decision ? (
                <Text variant="secondary" tone="textSecondary">
                  Kết quả: {DECISION_LABEL[detail.decision] ?? detail.decision}
                  {detail.actorName ? ` · ${detail.actorName}` : ''}
                </Text>
              ) : null}
              {detail.items.map((entry, index) => (
                <Card key={`${entry.code ?? entry.label}-${index}`}>
                  <Text variant="bodyStrong">{entry.label}</Text>
                  {entry.detail ? (
                    <Text variant="secondary" tone="textSecondary">
                      {entry.detail}
                    </Text>
                  ) : null}
                  {entry.note ? (
                    <Text variant="secondary" tone="muted">
                      {entry.note}
                    </Text>
                  ) : null}
                </Card>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </BottomSheet>
  );
}
