import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { formatDate } from '@/core/domain/date-format';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { useTheme } from '@/shared/theme/theme-provider';
import { Badge } from '@/shared/ui/Badge';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { KeyIcon } from '@/shared/ui/icons';
import { InfoRow } from '@/shared/ui/InfoRow';
import { LoadingState } from '@/shared/ui/LoadingState';
import { useScreenInsets } from '@/shared/ui/screen-insets';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import type { MyPermission } from '../../domain/entities';
import { useMyPermissions } from '../use-account-queries';

function summary(permission: MyPermission): string {
  return [permission.moduleName, permission.actionName, permission.scopeName]
    .filter(Boolean)
    .join(' · ');
}

/** Quyền của tôi: danh sách thẻ (tên quyền, phân hệ · thao tác · phạm vi, nguồn); chi tiết đầy đủ mở trong sheet. */
export function MyPermissionsScreen() {
  const { colors, spacing } = useTheme();
  const insets = useScreenInsets();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim());
  const query = useMyPermissions(debounced);
  const [selected, setSelected] = useState<MyPermission | null>(null);

  const items = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.content),
    [query.data],
  );
  const total = query.data?.pages[0]?.totalElements ?? 0;

  const renderItem = useCallback(
    ({ item }: { item: MyPermission }) => (
      <Card onPress={() => setSelected(item)} accessibilityLabel={`${item.name}. ${summary(item)}`}>
        <View style={{ gap: 4 }}>
          <Text variant="bodyStrong">{item.name}</Text>
          <Text variant="secondary" tone="textSecondary">
            {summary(item)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Badge
              label={item.source === 'ROLE' ? item.roleName || 'Từ vai trò' : 'Cấp riêng'}
              tone={item.source === 'ROLE' ? 'neutral' : 'info'}
            />
            {item.expiresAt ? (
              <Badge label={`Hết hạn ${formatDate(item.expiresAt)}`} tone="warning" />
            ) : null}
          </View>
        </View>
      </Card>
    ),
    [],
  );

  const header = (
    <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
      <TextField
        label="Tìm quyền"
        value={search}
        onChangeText={setSearch}
        placeholder="Tên quyền hoặc mã quyền"
        returnKeyType="search"
        autoCapitalize="none"
      />
      <Text variant="secondary" tone="muted" accessibilityLiveRegion="polite">
        {query.isPending ? '' : `${total} quyền`}
      </Text>
      {query.isError ? <Banner tone="danger" message={errorMessage(query.error)} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={items}
        keyExtractor={(item, index) => `${item.code}-${item.source}-${index}`}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl + insets.bottom }}
        keyboardShouldPersistTaps="handled"
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
              icon={<KeyIcon size={32} color={colors.primary} weight="bold" />}
              title="Không có quyền phù hợp"
              hint={debounced ? 'Thử từ khóa khác.' : 'Tài khoản chưa được cấp quyền nào.'}
            />
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? <LoadingState label="Đang tải thêm…" /> : undefined
        }
      />
      <BottomSheet
        visible={selected !== null}
        title={selected?.name ?? 'Quyền'}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <>
            <InfoRow label="Mã quyền" value={selected.code} />
            <InfoRow label="Mô tả" value={selected.description} />
            <InfoRow label="Phân hệ" value={selected.moduleName} />
            <InfoRow label="Đối tượng" value={selected.resourceName} />
            <InfoRow label="Thao tác" value={selected.actionName} />
            <InfoRow label="Phạm vi" value={selected.scopeName} />
            <InfoRow
              label="Nguồn"
              value={
                selected.source === 'ROLE'
                  ? `Vai trò ${selected.roleName ?? ''}`.trim()
                  : 'Cấp riêng cho tài khoản'
              }
            />
            <InfoRow label="Người cấp" value={selected.assignedByName} />
            <InfoRow label="Ngày cấp" value={formatDate(selected.assignedAt)} />
            <InfoRow label="Hết hạn" value={formatDate(selected.expiresAt) || 'Không giới hạn'} />
            <InfoRow label="Ghi chú" value={selected.note} />
          </>
        ) : null}
      </BottomSheet>
    </View>
  );
}
