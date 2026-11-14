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
import { FilterChips, type ChipOption } from '@/shared/ui/FilterChips';
import { KeyIcon } from '@/shared/ui/icons';
import { InfoRow } from '@/shared/ui/InfoRow';
import { LoadingState } from '@/shared/ui/LoadingState';
import { useScreenInsets } from '@/shared/ui/screen-insets';
import { SelectField } from '@/shared/ui/SelectField';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import type { MyPermission, MyPermissionFilters } from '../../domain/entities';
import { useMyPermissionFilterOptions, useMyPermissions } from '../use-account-queries';

function summary(permission: MyPermission): string {
  return [permission.moduleName, permission.actionName, permission.scopeName]
    .filter(Boolean)
    .join(' · ');
}

/** Quyền của tôi: danh sách thẻ (tên quyền, phân hệ · thao tác · phạm vi, nguồn); chi tiết đầy đủ mở trong sheet. */
type SourceChoice = 'all' | 'ROLE' | 'ACCOUNT';

const SOURCE_OPTIONS: readonly ChipOption<SourceChoice>[] = [
  { value: 'all', label: 'Tất cả nguồn quyền' },
  { value: 'ROLE', label: 'Từ vai trò' },
  { value: 'ACCOUNT', label: 'Quyền riêng của tài khoản' },
];

export function MyPermissionsScreen() {
  const { colors, spacing } = useTheme();
  const insets = useScreenInsets();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim());
  const [source, setSource] = useState<SourceChoice>('all');
  const [moduleName, setModuleName] = useState('');
  const [actionName, setActionName] = useState('');
  const options = useMyPermissionFilterOptions();
  const filters = useMemo<MyPermissionFilters>(
    () => ({
      ...(source === 'all' ? {} : { sourceType: source }),
      ...(moduleName ? { moduleName } : {}),
      ...(actionName ? { actionName } : {}),
    }),
    [source, moduleName, actionName],
  );
  const filtering = Object.keys(filters).length > 0;
  const query = useMyPermissions(debounced, filters);
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
              label={item.source === 'ROLE' ? item.roleName || 'Từ vai trò' : 'Quyền riêng'}
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
        placeholder="Tìm theo tên quyền, mô tả, vai trò"
        returnKeyType="search"
        autoCapitalize="none"
      />
      <FilterChips options={SOURCE_OPTIONS} value={source} onChange={setSource} />
      <SelectField
        label="Phân hệ"
        placeholder="Tất cả phân hệ"
        value={moduleName}
        options={(options.data?.modules ?? []).map((value) => ({ value, label: value }))}
        onChange={setModuleName}
      />
      <SelectField
        label="Hành động"
        placeholder="Tất cả hành động"
        value={actionName}
        options={(options.data?.actions ?? []).map((value) => ({ value, label: value }))}
        onChange={setActionName}
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
              title="Không có quyền nào phù hợp"
              hint={
                debounced || filtering
                  ? 'Thử từ khóa hoặc bộ lọc khác.'
                  : 'Tài khoản chưa được cấp quyền nào.'
              }
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
            <InfoRow label="Tài nguyên" value={selected.resourceName} />
            <InfoRow label="Hành động" value={selected.actionName} />
            <InfoRow label="Phạm vi" value={selected.scopeName} />
            <InfoRow
              label="Nguồn cấp"
              value={
                selected.source === 'ROLE'
                  ? `Vai trò ${selected.roleName ?? ''}`.trim()
                  : 'Quyền riêng của tài khoản'
              }
            />
            <InfoRow label="Người phân quyền" value={selected.assignedByName} />
            <InfoRow label="Ngày phân quyền" value={formatDate(selected.assignedAt)} />
            <InfoRow label="Hết hạn" value={formatDate(selected.expiresAt) || 'Không giới hạn'} />
            <InfoRow label="Ghi chú / lý do" value={selected.note} />
          </>
        ) : null}
      </BottomSheet>
    </View>
  );
}
