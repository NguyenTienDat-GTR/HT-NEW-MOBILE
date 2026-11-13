import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/core/domain/app-error';
import { useTheme } from '@/shared/theme/theme-provider';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FilterChips, type ChipOption } from '@/shared/ui/FilterChips';
import { BellSlashIcon } from '@/shared/ui/icons';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Text } from '@/shared/ui/Text';

import type { NotificationItem } from '../../domain/entities';
import {
  NOTIFICATION_GROUPS,
  notificationGroupOf,
  type NotificationGroup,
} from '../../domain/notification-rules';
import { NotificationCard } from '../components/NotificationCard';
import { NotificationDetailSheet } from '../components/NotificationDetailSheet';
import { openablePath } from '../notification-navigation';
import {
  flattenNotifications,
  useMarkAllRead,
  useMarkRead,
  useNotificationList,
} from '../use-notifications';

type Filter = 'all' | 'unread' | Exclude<NotificationGroup, 'other'>;

/** Nhãn ngắn cho chip để bộ lọc gọn trong 2 dòng (tên đầy đủ của nhóm xem ở NOTIFICATION_GROUPS). */
const SHORT_GROUP_LABELS: Record<(typeof NOTIFICATION_GROUPS)[number]['key'], string> = {
  training: 'Huấn luyện',
  certificate: 'Chứng chỉ',
  access: 'Quyền',
  unit: 'Đơn vị',
};

const FILTER_OPTIONS: readonly ChipOption<Filter>[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'unread', label: 'Chưa đọc' },
  ...NOTIFICATION_GROUPS.map((group) => ({
    value: group.key,
    label: SHORT_GROUP_LABELS[group.key],
  })),
];

function matches(item: NotificationItem, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'unread') return item.readAt === null;
  return notificationGroupOf(item) === filter;
}

export interface NotificationsScreenProps {
  /** Mở màn hình đích (route do lớp app cung cấp). */
  onOpenPath: (path: string) => void;
}

export function NotificationsScreen({ onOpenPath }: NotificationsScreenProps) {
  const { spacing, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const query = useNotificationList();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<NotificationItem | null>(null);

  const all = useMemo(() => flattenNotifications(query.data?.pages), [query.data]);
  const visible = useMemo(() => all.filter((item) => matches(item, filter)), [all, filter]);
  const unreadIds = useMemo(
    () => all.filter((item) => item.readAt === null).map((item) => item.id),
    [all],
  );

  const handlePress = useCallback(
    (item: NotificationItem) => {
      setSelected(item);
      if (item.readAt === null) markRead.mutate(item.id);
    },
    [markRead],
  );

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => (
      <NotificationCard item={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  const header = (
    <View style={{ gap: spacing.sm, paddingBottom: spacing.xs }}>
      <View style={styles.titleRow}>
        <Text variant="title" style={styles.title} accessibilityRole="header">
          Thông báo
        </Text>
        <Button
          label="Đọc tất cả"
          variant="ghost"
          size="sm"
          fullWidth={false}
          disabled={unreadIds.length === 0}
          loading={markAll.isPending}
          onPress={() => markAll.mutate(unreadIds)}
        />
      </View>
      <FilterChips options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
      {query.isError ? <Banner tone="danger" message={errorMessage(query.error)} /> : null}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        contentContainerStyle={{
          padding: spacing.md,
          paddingTop: spacing.md + insets.top,
          paddingBottom: spacing.xl,
        }}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => void query.refetch()}
          />
        }
        ListEmptyComponent={
          query.isPending ? (
            <LoadingState />
          ) : (
            <EmptyState
              icon={<BellSlashIcon size={32} color={colors.primary} weight="bold" />}
              title={filter === 'all' ? 'Chưa có thông báo' : 'Không có thông báo phù hợp'}
              hint={
                filter === 'all'
                  ? 'Thông báo về khóa huấn luyện, chứng chỉ và quyền sẽ hiện ở đây.'
                  : 'Thử chọn bộ lọc khác.'
              }
              actionLabel={filter === 'all' ? undefined : 'Xem tất cả'}
              onAction={filter === 'all' ? undefined : () => setFilter('all')}
            />
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? <LoadingState label="Đang tải thêm…" /> : undefined
        }
      />
      <NotificationDetailSheet
        item={selected}
        openPath={selected ? openablePath(selected) : null}
        onOpen={(path) => {
          setSelected(null);
          onOpenPath(path);
        }}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1 },
});
