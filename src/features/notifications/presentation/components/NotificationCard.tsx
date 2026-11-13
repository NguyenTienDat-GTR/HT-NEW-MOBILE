import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { relativeTime } from '@/core/domain/date-format';
import { useTheme } from '@/shared/theme/theme-provider';
import { Card } from '@/shared/ui/Card';
import { Text } from '@/shared/ui/Text';

import type { NotificationItem } from '../../domain/entities';

export interface NotificationCardProps {
  item: NotificationItem;
  onPress: (item: NotificationItem) => void;
}

/**
 * Một thông báo: tiêu đề, tối đa 2 dòng nội dung, thời gian. Chưa đọc: chấm xanh + tiêu đề đậm
 * (kèm chữ "Chưa đọc" cho trình đọc màn hình, không chỉ màu).
 */
function NotificationCardBase({ item, onPress }: NotificationCardProps) {
  const { colors } = useTheme();
  const unread = item.readAt === null;
  const time = relativeTime(item.createdAt);
  return (
    <Card
      onPress={() => onPress(item)}
      accessibilityLabel={`${unread ? 'Chưa đọc. ' : ''}${item.title}. ${item.message}. ${time}`}
    >
      <View style={styles.row}>
        <View
          style={[styles.dot, { backgroundColor: unread ? colors.primary : 'transparent' }]}
          accessibilityElementsHidden
        />
        <View style={styles.body}>
          <Text variant={unread ? 'bodyStrong' : 'body'} numberOfLines={2}>
            {item.title}
          </Text>
          {item.message ? (
            <Text variant="secondary" tone="textSecondary" numberOfLines={2}>
              {item.message}
            </Text>
          ) : null}
          <Text variant="secondary" tone="muted">
            {time}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export const NotificationCard = memo(NotificationCardBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 7 },
  body: { flex: 1, gap: 2 },
});
