import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { loadOptions } from '@/shared/resource/options';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { text } from '@/shared/resource/row';
import type { PermissionSubject, ResourceDefinition } from '@/shared/resource/types';
import { rowId, useResourceList } from '@/shared/resource/use-resource';
import { useTheme } from '@/shared/theme/theme-provider';
import { Badge } from '@/shared/ui/Badge';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FilterChips } from '@/shared/ui/FilterChips';
import { CheckIcon } from '@/shared/ui/icons';
import { LoadingState } from '@/shared/ui/LoadingState';
import { useScreenInsets } from '@/shared/ui/screen-insets';
import { SelectField } from '@/shared/ui/SelectField';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import { canApproveCertificates, isBulkEligible } from '../domain/certificate-permissions';

import { useRefreshCertificates } from './CertificateActions';
import { CertificateDecisionSheet, type DecisionResult } from './CertificateDecisionSheet';
import { certificateCard } from './certificate-view';

type StatusChoice = 'PENDING' | 'APPROVED' | 'REJECTED' | 'all';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'all', label: 'Tất cả' },
] as const;

/**
 * Duyệt chứng nhận: chọn một hoặc nhiều chứng nhận chờ duyệt rồi Duyệt / Từ chối cùng lúc; chứng nhận đã xử lý hoặc của
 * khóa đã kết thúc chỉ xem chi tiết. Mỗi thẻ có nút "Chi tiết" để xem đủ thông tin trước khi quyết định.
 */
export function CertificateApprovalsScreen({
  def,
  subject,
}: {
  def: ResourceDefinition;
  subject: PermissionSubject | null;
}) {
  const { colors, spacing, radius } = useTheme();
  const insets = useScreenInsets();
  const router = useRouter();
  const gateway = useResourceGateway();
  const refresh = useRefreshCertificates();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusChoice>('PENDING');
  const [course, setCourse] = useState('');
  const [selected, setSelected] = useState<Map<string, ResourceRow>>(new Map());
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const debounced = useDebouncedValue(search.trim());

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (course) next['course.courseCode'] = course;
    if (status !== 'all') next.approvalStatus = status;
    return next;
  }, [course, status]);
  const query = useResourceList(def, { search: debounced, status: undefined, filters });
  const courses = useQuery({
    queryKey: ['certificate-approval-courses'],
    queryFn: () =>
      loadOptions(gateway, '/training/courses', { value: 'courseCode', label: 'courseName' }),
    staleTime: 5 * 60_000,
  });
  const rows = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.content),
    [query.data],
  );

  if (!canApproveCertificates(subject))
    return <Banner tone="warning" message="Tài khoản của bạn không có quyền duyệt chứng nhận." />;

  const eligibleRows = rows.filter(isBulkEligible);
  const picked = [...selected.values()];
  const reset = () => setSelected(new Map());
  const toggle = (row: ResourceRow) =>
    setSelected((current) => {
      const next = new Map(current);
      const id = rowId(def, row);
      if (next.has(id)) next.delete(id);
      else next.set(id, row);
      return next;
    });
  const open = (row: ResourceRow) =>
    router.push(`/res/certificates/${encodeURIComponent(text(row, 'certificateCode'))}` as Href);

  const finish = async (data: DecisionResult) => {
    setResult(data);
    reset();
    setAction(null);
    await refresh();
  };

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
      <SelectField
        label="Khóa huấn luyện"
        value={course}
        options={courses.data ?? []}
        placeholder="Tất cả khóa"
        onChange={(value) => {
          setCourse(value);
          reset();
        }}
      />
      <FilterChips
        options={STATUS_OPTIONS}
        value={status}
        onChange={(value) => {
          setStatus(value);
          reset();
        }}
      />
      {eligibleRows.length > 0 ? (
        <Button
          label={
            picked.length === eligibleRows.length
              ? 'Bỏ chọn tất cả'
              : `Chọn tất cả ${eligibleRows.length} chứng nhận chờ duyệt đang hiện`
          }
          variant="outline"
          size="sm"
          onPress={() =>
            picked.length === eligibleRows.length
              ? reset()
              : setSelected(new Map(eligibleRows.map((row) => [rowId(def, row), row])))
          }
        />
      ) : null}
      {result ? (
        <Banner
          tone={result.failedCount > 0 ? 'warning' : 'info'}
          message={`Đã xử lý ${result.successCount} chứng nhận${
            result.failedCount > 0
              ? `, ${result.failedCount} lỗi: ${result.failures
                  .map((item) => `${item.leaderFullName || item.id} (${item.reason})`)
                  .join('; ')}`
              : '.'
          }`}
        />
      ) : null}
      {query.isError ? <Banner tone="danger" message={errorMessage(query.error)} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={rows}
        keyExtractor={(item, index) => rowId(def, item) || String(index)}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: picked.length > 0 ? spacing.xl * 3 : spacing.xl + insets.bottom,
        }}
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
              title="Không có chứng nhận"
              hint="Thử đổi trạng thái, khóa hoặc từ khóa tìm kiếm."
            />
          )
        }
        renderItem={({ item }) => {
          const view = certificateCard(item);
          const selectable = isBulkEligible(item);
          const on = selected.has(rowId(def, item));
          return (
            <Card style={on ? { borderColor: colors.primary, borderWidth: 2 } : undefined}>
              <View style={{ gap: spacing.sm }}>
                <Pressable
                  onPress={() => (selectable ? toggle(item) : open(item))}
                  accessibilityRole={selectable ? 'checkbox' : 'button'}
                  accessibilityState={selectable ? { checked: on } : undefined}
                  accessibilityLabel={`${view.title}. ${
                    selectable ? (on ? 'Đã chọn' : 'Chưa chọn') : 'Mở chi tiết'
                  }`}
                  style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
                >
                  {selectable ? (
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: radius.input,
                        borderWidth: 2,
                        borderColor: on ? colors.primary : colors.input,
                        backgroundColor: on ? colors.primary : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {on ? (
                        <CheckIcon size={18} color={colors.primaryForeground} weight="bold" />
                      ) : null}
                    </View>
                  ) : null}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyStrong">{view.title}</Text>
                    {view.subtitle ? (
                      <Text variant="secondary" tone="textSecondary">
                        {view.subtitle}
                      </Text>
                    ) : null}
                    {(view.lines ?? []).filter(Boolean).map((line) => (
                      <Text key={line} variant="secondary" tone="muted">
                        {line}
                      </Text>
                    ))}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {(view.badges ?? []).map((badge) => (
                        <Badge key={badge.label} label={badge.label} tone={badge.tone} />
                      ))}
                    </View>
                  </View>
                </Pressable>
                {selectable ? (
                  <Button label="Chi tiết" variant="outline" size="sm" onPress={() => open(item)} />
                ) : null}
              </View>
            </Card>
          );
        }}
      />

      {picked.length > 0 ? (
        <View
          style={{
            backgroundColor: colors.surface1,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            padding: spacing.md,
            paddingBottom: spacing.md + insets.bottom,
            gap: spacing.xs,
          }}
        >
          <Button label={`Duyệt (${picked.length})`} onPress={() => setAction('approve')} />
          <Button
            label={`Từ chối (${picked.length})`}
            variant="destructive"
            onPress={() => setAction('reject')}
          />
        </View>
      ) : null}

      <CertificateDecisionSheet
        action={action}
        rows={picked}
        onClose={() => setAction(null)}
        onDone={(data) => void finish(data)}
      />
    </View>
  );
}
