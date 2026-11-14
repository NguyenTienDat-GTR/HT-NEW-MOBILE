import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDate } from '@/core/domain/date-format';
import { useTheme } from '@/shared/theme/theme-provider';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { CheckboxRow } from '@/shared/ui/CheckboxRow';
import { DateField } from '@/shared/ui/DateField';
import { FilterChips } from '@/shared/ui/FilterChips';
import { FunnelSimpleIcon, XIcon } from '@/shared/ui/icons';
import { SelectField } from '@/shared/ui/SelectField';
import { Text } from '@/shared/ui/Text';

import type {
  AppliedFilters,
  FilterOption,
  FilterOptions,
  ScopeOption,
} from '../../domain/entities';
import {
  DATE_PRESETS,
  DEFAULT_FILTERS,
  activeFilterCount,
  effectiveRange,
  presetLabel,
  type AnalyticsFilterState,
  type DatePresetId,
  type FilterVisibility,
} from '../../domain/filters';
import {
  GENDER_OPTIONS,
  GROUP_BY_OPTIONS,
  SCOPE_NAMES,
  TIME_BUCKET_OPTIONS,
} from '../../domain/labels';

export interface FilterBarProps {
  filters: AnalyticsFilterState;
  onChange: (filters: AnalyticsFilterState) => void;
  visible: FilterVisibility;
  options?: FilterOptions;
  /** Phạm vi của dữ liệu đang xem (all/diocese/deanery/parish). */
  scope?: string;
  scopes?: readonly ScopeOption[];
  /** Khoảng ngày thực tế BE đã dùng (hiện cho người xem biết "12 tháng qua" là từ ngày nào). */
  applied?: AppliedFilters;
  busy?: boolean;
}

const asOptions = (list: readonly FilterOption[] | undefined) =>
  (list ?? []).map((item) => ({ value: item.value, label: item.label }));

/**
 * Thanh tóm tắt bộ lọc: nút "Bộ lọc (n)", khoảng thời gian đang áp và các lọc đang bật (chạm để bỏ từng cái).
 * Mọi chỉnh sửa nằm trong sheet dưới màn hình với ô nhập/chọn lớn, bấm "Áp dụng" mới tải lại số liệu.
 */
export function FilterBar({
  filters,
  onChange,
  visible,
  options,
  scope,
  scopes,
  applied,
  busy,
}: FilterBarProps) {
  const { colors, spacing, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filters);

  const named = (list: readonly { value: string; label: string }[] | undefined, value: string) =>
    list?.find((item) => item.value === value)?.label ?? value;

  const chips: { key: string; label: string; clear: () => void }[] = [];
  const set = (patch: Partial<AnalyticsFilterState>) => onChange({ ...filters, ...patch });
  if (filters.deaneryId && visible.unit)
    chips.push({
      key: 'deanery',
      label: `Giáo hạt: ${named(options?.deaneries, filters.deaneryId)}`,
      clear: () => set({ deaneryId: '', parishId: '' }),
    });
  if (filters.parishId && visible.unit)
    chips.push({
      key: 'parish',
      label: `Giáo xứ: ${named(options?.parishes, filters.parishId)}`,
      clear: () => set({ parishId: '' }),
    });
  if (filters.courseType && visible.course)
    chips.push({
      key: 'type',
      label: `Loại khóa: ${named(options?.courseTypes, filters.courseType)}`,
      clear: () => set({ courseType: '', courseCode: '' }),
    });
  if (filters.courseCode && visible.course)
    chips.push({
      key: 'course',
      label: `Khóa: ${named(options?.courses, filters.courseCode)}`,
      clear: () => set({ courseCode: '' }),
    });
  if (filters.leaderLevel && visible.leader)
    chips.push({
      key: 'level',
      label: `Cấp bậc: ${named(options?.leaderLevels, filters.leaderLevel)}`,
      clear: () => set({ leaderLevel: '' }),
    });
  if (filters.gender && visible.leader)
    chips.push({
      key: 'gender',
      label: `Giới tính: ${named(GENDER_OPTIONS, filters.gender)}`,
      clear: () => set({ gender: '' }),
    });
  if (filters.groupBy && visible.groupBy)
    chips.push({
      key: 'group',
      label: `Nhóm theo: ${GROUP_BY_OPTIONS.find((o) => o.value === filters.groupBy)?.label ?? filters.groupBy}`,
      clear: () => set({ groupBy: '' }),
    });
  if (filters.includeInactiveUnits && visible.inactive)
    chips.push({
      key: 'inactive',
      label: 'Gồm đơn vị ngưng',
      clear: () => set({ includeInactiveUnits: false }),
    });

  const range =
    applied?.fromDate || applied?.toDate
      ? `${formatDate(applied?.fromDate) || '…'} – ${formatDate(applied?.toDate) || '…'}`
      : '';

  return (
    <View
      accessibilityLabel="Bộ lọc số liệu"
      style={[
        styles.box,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.panel,
          padding: spacing.sm,
          gap: spacing.xs,
        },
      ]}
    >
      <View style={styles.top}>
        <View style={styles.summary}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {presetLabel(filters)}
            {filters.compare ? ' · so sánh kỳ trước' : ''}
          </Text>
          {range ? (
            <Text variant="secondary" tone="muted" numberOfLines={1}>
              {range} · theo{' '}
              {TIME_BUCKET_OPTIONS.find((o) => o.value === filters.timeBucket)?.label.toLowerCase()}
              {busy ? ' · đang tải…' : ''}
            </Text>
          ) : null}
        </View>
        <Button
          label={count > 0 ? `Bộ lọc (${count})` : 'Bộ lọc'}
          variant="outline"
          size="sm"
          fullWidth={false}
          icon={<FunnelSimpleIcon size={20} color={colors.foreground} weight="bold" />}
          onPress={() => setOpen(true)}
        />
      </View>

      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <Pressable
              key={chip.key}
              accessibilityRole="button"
              accessibilityLabel={`Bỏ lọc ${chip.label}`}
              onPress={chip.clear}
              style={[
                styles.chip,
                { backgroundColor: colors.primarySoft, borderColor: colors.primary },
              ]}
            >
              <Text variant="label" tone="primary" numberOfLines={1} style={styles.chipText}>
                {chip.label}
              </Text>
              <XIcon size={16} color={colors.primary} weight="bold" />
            </Pressable>
          ))}
        </View>
      ) : null}

      <FilterSheet
        visible={open}
        initial={filters}
        visibleFields={visible}
        options={options}
        scope={scope}
        scopes={scopes}
        applied={applied}
        onClose={() => setOpen(false)}
        onApply={(next) => {
          setOpen(false);
          onChange(next);
        }}
      />
    </View>
  );
}

interface FilterSheetProps {
  visible: boolean;
  initial: AnalyticsFilterState;
  visibleFields: FilterVisibility;
  options?: FilterOptions;
  scope?: string;
  scopes?: readonly ScopeOption[];
  applied?: AppliedFilters;
  onClose: () => void;
  onApply: (filters: AnalyticsFilterState) => void;
}

function FilterSheet({
  visible,
  initial,
  visibleFields,
  options,
  scope,
  scopes,
  applied,
  onClose,
  onApply,
}: FilterSheetProps) {
  const [draft, setDraft] = useState(initial);
  const [seen, setSeen] = useState(visible);
  // Mỗi lần mở sheet thì bắt đầu từ bộ lọc đang áp (bỏ các thay đổi dở dang lần trước).
  if (visible !== seen) {
    setSeen(visible);
    if (visible) setDraft(initial);
  }
  const set = (patch: Partial<AnalyticsFilterState>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const parishes = useMemo(
    () => (options?.parishes ?? []).filter((p) => !draft.deaneryId || p.parent === draft.deaneryId),
    [options?.parishes, draft.deaneryId],
  );
  const courses = useMemo(
    () =>
      (options?.courses ?? []).filter((c) => !draft.courseType || c.parent === draft.courseType),
    [options?.courses, draft.courseType],
  );
  const showDeanery =
    visibleFields.unit &&
    (options?.deaneries.length ?? 0) > 1 &&
    scope !== 'deanery' &&
    scope !== 'parish';
  const showParish =
    visibleFields.unit && (options?.parishes.length ?? 0) > 1 && scope !== 'parish';
  const groupOptions = GROUP_BY_OPTIONS.filter(
    (o) => !o.scopes || (scope ? o.scopes.includes(scope) : false),
  ).filter((o) => !visibleFields.groupByValues || visibleFields.groupByValues.includes(o.value));

  const presets = [...DATE_PRESETS, { id: 'custom' as const, label: 'Tùy chọn' }].map((p) => ({
    value: p.id,
    label: p.label,
  }));
  // Khoảng ngày đang chọn: chọn một ô ngày là chuyển sang "Tùy chọn", ô còn lại giữ giá trị đang thấy.
  const range = effectiveRange(draft, applied);
  const pickRange = (patch: Partial<{ fromDate: string; toDate: string }>) =>
    set({ preset: 'custom', fromDate: range.fromDate, toDate: range.toDate, ...patch });

  return (
    <BottomSheet
      visible={visible}
      title="Bộ lọc số liệu"
      onClose={onClose}
      footer={
        <>
          <Button label="Áp dụng" onPress={() => onApply(draft)} />
          <Button
            label="Đặt lại mặc định"
            variant="ghost"
            size="sm"
            onPress={() => setDraft({ ...DEFAULT_FILTERS, scope: draft.scope })}
          />
        </>
      }
    >
      {scopes && scopes.length > 1 ? (
        <SelectField
          label="Phạm vi xem"
          allowClear={false}
          value={draft.scope || scopes[0]?.type || ''}
          options={scopes.map((s) => ({
            value: s.type,
            label: `${SCOPE_NAMES[s.type]} ${s.name}`.trim(),
          }))}
          // Đổi phạm vi thì lọc đơn vị cũ không còn đúng nghĩa: bỏ để số liệu khớp phạm vi mới.
          onChange={(value) =>
            set({
              scope: value as AnalyticsFilterState['scope'],
              deaneryId: '',
              parishId: '',
              groupBy: '',
            })
          }
        />
      ) : null}

      <Text variant="label">Khoảng thời gian</Text>
      <FilterChips<DatePresetId>
        options={presets as { value: DatePresetId; label: string }[]}
        value={draft.preset}
        onChange={(value) => (value === 'custom' ? pickRange({}) : set({ preset: value }))}
      />
      <View style={styles.dates}>
        <View style={styles.date}>
          <DateField
            label="Từ ngày"
            value={range.fromDate}
            maximumDate={range.toDate || undefined}
            onChange={(value) => pickRange({ fromDate: value })}
          />
        </View>
        <View style={styles.date}>
          <DateField
            label="Đến ngày"
            value={range.toDate}
            minimumDate={range.fromDate || undefined}
            onChange={(value) => pickRange({ toDate: value })}
          />
        </View>
      </View>

      <Text variant="label">Gom theo kỳ</Text>
      <FilterChips
        options={TIME_BUCKET_OPTIONS}
        value={draft.timeBucket}
        onChange={(value) => set({ timeBucket: value })}
      />
      <CheckboxRow
        label="So sánh với kỳ trước"
        checked={draft.compare}
        onChange={(checked) => set({ compare: checked })}
      />

      {showDeanery ? (
        <SelectField
          label="Giáo hạt"
          value={draft.deaneryId}
          options={asOptions(options?.deaneries)}
          onChange={(value) => set({ deaneryId: value, parishId: '' })}
        />
      ) : null}
      {showParish ? (
        <SelectField
          label="Giáo xứ / giáo họ / giáo điểm"
          value={draft.parishId}
          options={asOptions(parishes)}
          onChange={(value) => set({ parishId: value })}
        />
      ) : null}
      {visibleFields.course ? (
        <>
          <SelectField
            label="Loại khóa"
            value={draft.courseType}
            options={asOptions(options?.courseTypes)}
            onChange={(value) => set({ courseType: value, courseCode: '' })}
          />
          <SelectField
            label="Khóa huấn luyện"
            value={draft.courseCode}
            options={asOptions(courses)}
            onChange={(value) => set({ courseCode: value })}
          />
        </>
      ) : null}
      {visibleFields.leader ? (
        <>
          <SelectField
            label="Cấp bậc"
            value={draft.leaderLevel}
            options={asOptions(options?.leaderLevels)}
            onChange={(value) => set({ leaderLevel: value })}
          />
          <SelectField
            label="Giới tính"
            value={draft.gender}
            options={GENDER_OPTIONS}
            onChange={(value) => set({ gender: value })}
          />
        </>
      ) : null}
      {visibleFields.groupBy && groupOptions.length > 0 ? (
        <SelectField
          label="Phân tích theo nhóm"
          placeholder="Không nhóm thêm"
          value={draft.groupBy}
          options={groupOptions}
          onChange={(value) => set({ groupBy: value })}
        />
      ) : null}
      {visibleFields.inactive ? (
        <CheckboxRow
          label="Gồm đơn vị ngưng hoạt động"
          checked={draft.includeInactiveUnits}
          onChange={(checked) => set({ includeInactiveUnits: checked })}
        />
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summary: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dates: { flexDirection: 'row', gap: 12 },
  date: { flex: 1 },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    maxWidth: '100%',
  },
  chipText: { flexShrink: 1 },
});
