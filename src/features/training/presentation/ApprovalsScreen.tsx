import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/core/domain/app-error';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { loadOptions } from '@/shared/resource/options';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { text } from '@/shared/resource/row';
import type { PermissionSubject, ResourceDefinition } from '@/shared/resource/types';
import { resourceKey, rowId, useResourceList } from '@/shared/resource/use-resource';
import { useTheme } from '@/shared/theme/theme-provider';
import { Badge } from '@/shared/ui/Badge';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { CheckIcon } from '@/shared/ui/icons';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FilterChips } from '@/shared/ui/FilterChips';
import { LoadingState } from '@/shared/ui/LoadingState';
import { SelectField } from '@/shared/ui/SelectField';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import { achievableLevels, type LevelInfo } from '../domain/achievable-levels';
import { canApproveRegistrations } from '../domain/training-permissions';

import { registrationCard } from './participation-common';

type StatusChoice = 'all' | 'PENDING' | 'REJECTED';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'REJECTED', label: 'Từ chối' },
] as const;

interface BulkResult {
  successCount: number;
  failedCount: number;
  failures: { id: string; leaderFullName: string; reason: string }[];
}

const isPending = (row: ResourceRow) =>
  row.approvalStatus === 'PENDING' || row.approvalStatus === 'SUBMITTED';
const isException = (row: ResourceRow) => row.eligible === false;

/**
 * Duyệt đăng ký: chọn một hoặc nhiều hồ sơ rồi Duyệt / Từ chối cùng lúc. Hồ sơ đã bị từ chối chỉ duyệt lại được.
 * Hồ sơ ngoại lệ khi duyệt cần chọn cấp độ đạt được (cao hơn cấp hiện tại, không vượt cấp của khóa).
 */
export function ApprovalsScreen({
  def,
  subject,
}: {
  def: ResourceDefinition;
  subject: PermissionSubject | null;
}) {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const gateway = useResourceGateway();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusChoice>('all');
  const [course, setCourse] = useState('');
  const [selected, setSelected] = useState<Map<string, ResourceRow>>(new Map());
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);
  const debounced = useDebouncedValue(search.trim());

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (course) next['course.courseCode'] = course;
    if (status !== 'all') next.approvalStatus = status;
    return next;
  }, [course, status]);
  const query = useResourceList(def, { search: debounced, status: undefined, filters });
  const courses = useQuery({
    queryKey: ['approval-course-options'],
    queryFn: () =>
      loadOptions(gateway, '/training/courses', { value: 'courseCode', label: 'courseName' }),
    staleTime: 5 * 60_000,
  });
  const rows = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.content),
    [query.data],
  );

  if (!canApproveRegistrations(subject))
    return <Banner tone="warning" message="Tài khoản của bạn không có quyền duyệt đăng ký." />;

  const toggle = (row: ResourceRow) =>
    setSelected((current) => {
      const next = new Map(current);
      const id = rowId(def, row);
      if (next.has(id)) next.delete(id);
      else next.set(id, row);
      return next;
    });
  const picked = [...selected.values()];
  const canReject = picked.length > 0 && picked.every(isPending);

  const finish = async (data: BulkResult) => {
    setResult(data);
    setSelected(new Map());
    setAction(null);
    await queryClient.invalidateQueries({ queryKey: resourceKey('approvals') });
    await queryClient.invalidateQueries({ queryKey: resourceKey('registrations') });
    await queryClient.invalidateQueries({ queryKey: resourceKey('participants') });
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
          setSelected(new Map());
        }}
      />
      <FilterChips
        options={STATUS_OPTIONS}
        value={status}
        onChange={(value) => {
          setStatus(value);
          setSelected(new Map());
        }}
      />
      {result ? (
        <Banner
          tone={result.failedCount > 0 ? 'warning' : 'info'}
          message={`Đã xử lý ${result.successCount} hồ sơ${
            result.failedCount > 0
              ? `, ${result.failedCount} hồ sơ lỗi: ${result.failures
                  .map((item) => `${item.leaderFullName} (${item.reason})`)
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
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 3 }}
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
              title="Không có hồ sơ chờ duyệt"
              hint="Thử đổi khóa hoặc từ khóa tìm kiếm."
            />
          )
        }
        renderItem={({ item }) => {
          const view = registrationCard(item);
          const on = selected.has(rowId(def, item));
          return (
            <Card
              onPress={() => toggle(item)}
              accessibilityLabel={`${view.title}. ${on ? 'Đã chọn' : 'Chưa chọn'}`}
              style={on ? { borderColor: colors.primary, borderWidth: 2 } : undefined}
            >
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
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
                  {text(item, 'exceptionReason') ? (
                    <Text variant="secondary" tone="muted">
                      {`Lý do ngoại lệ: ${text(item, 'exceptionReason')}`}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {(view.badges ?? []).map((badge) => (
                      <Badge key={badge.label} label={badge.label} tone={badge.tone} />
                    ))}
                  </View>
                </View>
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
            disabled={!canReject}
            onPress={() => setAction('reject')}
          />
        </View>
      ) : null}

      <DecisionSheet
        action={action}
        rows={picked}
        onClose={() => setAction(null)}
        onDone={(data) => void finish(data)}
      />
    </View>
  );
}

function DecisionSheet({
  action,
  rows,
  onClose,
  onDone,
}: {
  action: 'approve' | 'reject' | null;
  rows: ResourceRow[];
  onClose: () => void;
  onDone: (result: BulkResult) => void;
}) {
  const gateway = useResourceGateway();
  const [note, setNote] = useState('');
  const [levels, setLevels] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seen, setSeen] = useState<typeof action>(null);
  if (action !== seen) {
    setSeen(action);
    setNote('');
    setLevels({});
    setError(null);
  }

  const catalog = useQuery({
    queryKey: ['leader-levels-catalog'],
    queryFn: () => gateway.call<LevelInfo[]>('GET', '/leader-levels/options'),
    enabled: action === 'approve',
    staleTime: 10 * 60_000,
  });
  const needLevel =
    action === 'approve' ? rows.filter((row) => isException(row) && isPending(row)) : [];
  const missingLevel = needLevel.some((row) => !levels[text(row, 'id')]);
  const rejecting = action === 'reject';
  const noteMissing = rejecting && note.trim() === '';

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const achieved = Object.fromEntries(
        needLevel.map((row) => [text(row, 'id'), levels[text(row, 'id')]!]),
      );
      const data = await gateway.call<BulkResult>('POST', '/training/registrations/bulk-approval', {
        body: {
          ids: rows.map((row) => text(row, 'id')),
          approved: !rejecting,
          review: note.trim() || undefined,
          achievedLevels: Object.keys(achieved).length ? achieved : undefined,
        },
      });
      onDone(data);
    } catch (exception) {
      setError(errorMessage(exception));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={action !== null}
      title={rejecting ? `Từ chối ${rows.length} hồ sơ` : `Duyệt ${rows.length} hồ sơ`}
      onClose={onClose}
      footer={
        <>
          <Button
            label={rejecting ? 'Từ chối' : 'Duyệt'}
            variant={rejecting ? 'destructive' : 'primary'}
            loading={busy}
            disabled={noteMissing || (!rejecting && missingLevel)}
            onPress={() => void submit()}
          />
          <Button label="Hủy" variant="ghost" size="sm" onPress={onClose} />
        </>
      }
    >
      <TextField
        label={rejecting ? 'Lý do từ chối (bắt buộc)' : 'Nhận xét (không bắt buộc)'}
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={1000}
      />
      {needLevel.length > 0 ? (
        <Text variant="secondary" tone="muted">
          Hồ sơ ngoại lệ cần chọn cấp độ đạt được sau khi hoàn thành khóa.
        </Text>
      ) : null}
      {needLevel.map((row) => {
        const options = achievableLevels(
          catalog.data ?? [],
          text(row, 'leaderLevel'),
          text(row, 'courseResultingLevel'),
        ).map((level) => ({ value: level.levelCode, label: level.levelName }));
        return (
          <SelectField
            key={text(row, 'id')}
            label={`Cấp độ đạt được: ${text(row, 'leaderFullName')}`}
            value={levels[text(row, 'id')] ?? ''}
            options={options}
            placeholder={catalog.isPending ? 'Đang tải…' : 'Chọn cấp độ'}
            allowClear={false}
            onChange={(value) => setLevels((current) => ({ ...current, [text(row, 'id')]: value }))}
          />
        );
      })}
      {error ? <Banner tone="danger" message={error} /> : null}
    </BottomSheet>
  );
}
