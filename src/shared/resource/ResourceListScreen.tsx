import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/core/domain/app-error';
import { fmtNumber } from '@/core/domain/number-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';

import { useDebouncedValue } from '../hooks/use-debounced-value';
import { useTheme } from '../theme/theme-provider';
import { Badge } from '../ui/Badge';
import { Banner } from '../ui/Banner';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { FilterChips } from '../ui/FilterChips';
import { FunnelSimpleIcon, ListIcon } from '../ui/icons';
import { LoadingState } from '../ui/LoadingState';
import { SelectField } from '../ui/SelectField';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';

import type { ListFilterDef, PermissionSubject, ResourceDefinition } from './types';
import { rowId, useOptions, useResourceList } from './use-resource';

type StatusChoice = 'all' | 'active' | 'inactive';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'inactive', label: 'Tạm ngưng' },
] as const;

export interface ResourceListScreenProps {
  def: ResourceDefinition;
  subject: PermissionSubject | null;
  onOpen: (row: ResourceRow) => void;
  onCreate: () => void;
  /** Bộ lọc áp sẵn khi mở (vd. từ chi tiết khóa sang danh sách đăng ký của khóa đó). */
  initialFilters?: Record<string, string>;
}

/**
 * Danh sách thẻ chạy theo cấu hình: tìm kiếm, lọc trạng thái, bộ lọc trong sheet, cuộn vô hạn.
 * Mỗi thẻ chỉ có tiêu đề + 2 dòng + nhãn; mọi trường khác nằm ở màn chi tiết (không bảng cuộn ngang).
 */
export function ResourceListScreen({
  def,
  subject,
  onOpen,
  onCreate,
  initialFilters,
}: ResourceListScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [statusChoice, setStatusChoice] = useState<StatusChoice>('all');
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters ?? {});
  const [sheetOpen, setSheetOpen] = useState(false);
  const debounced = useDebouncedValue(search.trim());

  const status = statusChoice === 'all' ? undefined : statusChoice === 'active';
  const query = useResourceList(def, { search: debounced, status, filters });
  const rows = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.content),
    [query.data],
  );
  const total = query.data?.pages[0]?.totalElements ?? 0;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const canCreate = def.canCreate(subject) && Boolean(def.form);

  const renderItem = useCallback(
    ({ item }: { item: ResourceRow }) => {
      const view = def.card(item);
      return (
        <Card
          onPress={() => onOpen(item)}
          accessibilityLabel={`${view.title}. ${(view.lines ?? []).filter(Boolean).join('. ')}`}
        >
          <View style={styles.card}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {view.title}
            </Text>
            {view.subtitle ? (
              <Text variant="secondary" tone="textSecondary" numberOfLines={2}>
                {view.subtitle}
              </Text>
            ) : null}
            {(view.lines ?? []).filter(Boolean).map((line) => (
              <Text key={line} variant="secondary" tone="muted" numberOfLines={2}>
                {line}
              </Text>
            ))}
            {view.badges?.length ? (
              <View style={styles.badges}>
                {view.badges.map((badge) => (
                  <Badge key={badge.label} label={badge.label} tone={badge.tone} />
                ))}
              </View>
            ) : null}
          </View>
        </Card>
      );
    },
    [def, onOpen],
  );

  const header = (
    <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
      <TextField
        label="Tìm kiếm"
        value={search}
        onChangeText={setSearch}
        placeholder={def.searchPlaceholder}
        returnKeyType="search"
        autoCapitalize="none"
      />
      {def.statusFilter ? (
        <FilterChips options={STATUS_OPTIONS} value={statusChoice} onChange={setStatusChoice} />
      ) : null}
      <View style={styles.summary}>
        <Text
          variant="secondary"
          tone="muted"
          style={styles.count}
          accessibilityLiveRegion="polite"
        >
          {query.isPending ? '' : `${fmtNumber(total)} kết quả`}
        </Text>
        {def.filters?.length ? (
          <Button
            label={activeFilterCount > 0 ? `Bộ lọc (${activeFilterCount})` : 'Bộ lọc'}
            variant="outline"
            size="sm"
            fullWidth={false}
            icon={<FunnelSimpleIcon size={20} color={colors.foreground} weight="bold" />}
            onPress={() => setSheetOpen(true)}
          />
        ) : null}
      </View>
      {query.isError ? <Banner tone="danger" message={errorMessage(query.error)} /> : null}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={rows}
        keyExtractor={(item, index) => rowId(def, item) || String(index)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
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
              icon={<ListIcon size={32} color={colors.primary} weight="bold" />}
              title={
                debounced || activeFilterCount > 0
                  ? 'Không có kết quả phù hợp'
                  : `Chưa có ${def.singular.toLowerCase()}`
              }
              hint={
                debounced || activeFilterCount > 0 ? 'Thử từ khóa hoặc bộ lọc khác.' : undefined
              }
              actionLabel={activeFilterCount > 0 ? 'Xóa bộ lọc' : undefined}
              onAction={activeFilterCount > 0 ? () => setFilters({}) : undefined}
            />
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? <LoadingState label="Đang tải thêm…" /> : undefined
        }
      />

      {canCreate ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.surface1,
              borderTopColor: colors.border,
              padding: spacing.md,
              paddingBottom: spacing.md + insets.bottom,
            },
          ]}
        >
          <Button label={`Thêm ${def.singular.toLowerCase()}`} onPress={onCreate} />
        </View>
      ) : null}

      <FilterSheet
        def={def}
        visible={sheetOpen}
        filters={filters}
        onClose={() => setSheetOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setSheetOpen(false);
        }}
      />
    </View>
  );
}

function FilterSelect({
  def,
  filter,
  values,
  onChange,
}: {
  def: ResourceDefinition;
  filter: ListFilterDef;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const { options } = useOptions(
    filter.options,
    { values, mode: 'create', row: null },
    `${def.id}:filter:${filter.key}`,
  );
  return (
    <SelectField
      label={filter.label}
      value={values[filter.key] ?? ''}
      options={options}
      onChange={(value) => onChange(filter.key, value)}
    />
  );
}

function FilterSheet({
  def,
  visible,
  filters,
  onClose,
  onApply,
}: {
  def: ResourceDefinition;
  visible: boolean;
  filters: Record<string, string>;
  onClose: () => void;
  onApply: (filters: Record<string, string>) => void;
}) {
  const [draft, setDraft] = useState(filters);
  const [seen, setSeen] = useState(visible);
  // Mỗi lần mở sheet bắt đầu từ bộ lọc đang áp (bỏ thay đổi dở dang lần trước).
  if (visible !== seen) {
    setSeen(visible);
    if (visible) setDraft(filters);
  }
  const change = (key: string, value: string) =>
    setDraft((current) => {
      const next = { ...current, [key]: value };
      // Bộ lọc phụ thuộc vào bộ lọc vừa đổi thì bị xóa (đổi giáo hạt thì bỏ giáo xứ).
      for (const filter of def.filters ?? [])
        if (filter.dependsOn?.includes(key)) next[filter.key] = '';
      return next;
    });

  return (
    <BottomSheet
      visible={visible}
      title="Bộ lọc"
      onClose={onClose}
      footer={
        <>
          <Button label="Áp dụng" onPress={() => onApply(draft)} />
          <Button label="Xóa bộ lọc" variant="ghost" size="sm" onPress={() => setDraft({})} />
        </>
      }
    >
      {(def.filters ?? []).map((filter) => (
        <FilterSelect key={filter.key} def={def} filter={filter} values={draft} onChange={change} />
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  count: { flex: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
