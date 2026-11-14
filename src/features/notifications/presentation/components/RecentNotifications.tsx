import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme/theme-provider';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { BellIcon } from '@/shared/ui/icons';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Text } from '@/shared/ui/Text';

import { flattenNotifications, useNotificationList } from '../use-notifications';

const LIMIT = 5;

/**
 * Khối "Thông báo mới" ở tổng quan (như web): năm thông báo gần nhất, mỗi dòng có tiêu đề và nhãn "Mới" / "Đã đọc", kèm
 * lối "Xem tất cả" tới hộp thư. Dùng lại cache danh sách thông báo nên không gọi thêm API khi hộp thư đã mở.
 */
export function RecentNotifications({ onOpenAll }: { onOpenAll: () => void }) {
  const { colors, iconSize } = useTheme();
  const query = useNotificationList();
  const items = flattenNotifications(query.data?.pages).slice(0, LIMIT);
  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.titles}>
          <Text variant="heading" accessibilityRole="header">
            Thông báo mới
          </Text>
          <Text variant="secondary" tone="muted">
            Các sự kiện quy trình gần đây.
          </Text>
        </View>
        <Button
          label="Xem tất cả"
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={onOpenAll}
        />
      </View>
      {query.isPending ? <LoadingState /> : null}
      {items.map((item) => {
        const unread = item.readAt === null;
        return (
          <View key={item.id} style={styles.row} accessible>
            <View
              style={[
                styles.icon,
                { backgroundColor: unread ? colors.primarySoft : colors.surface2 },
              ]}
            >
              <BellIcon
                size={iconSize.sm}
                color={unread ? colors.primary : colors.muted}
                weight="bold"
              />
            </View>
            <Text variant="body" style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <Text variant="secondary" tone={unread ? 'primary' : 'muted'}>
              {unread ? 'Mới' : 'Đã đọc'}
            </Text>
          </View>
        );
      })}
      {query.data && items.length === 0 ? (
        <Text variant="secondary" tone="muted">
          Chưa có thông báo mới.
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  titles: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1 },
});
