import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { useResourceGateway } from '@/shared/resource/resource-context';
import type { CustomFieldProps } from '@/shared/resource/types';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { CheckboxRow } from '@/shared/ui/CheckboxRow';
import { FieldLabel } from '@/shared/ui/FieldLabel';
import { FilterChips, type ChipOption } from '@/shared/ui/FilterChips';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import {
  SOURCE_YEAR_WINDOW,
  defaultLeaderSelection,
  estimateCopyCount,
  inYearWindow,
  matchesCandidate,
  matchesSource,
  parseCopyState,
  stringifyCopyState,
  type CopyCandidate,
  type CopyMode,
  type CopySource,
  type ResultFilter,
} from '../domain/copy-participants';

const MODE_OPTIONS: readonly ChipOption<CopyMode>[] = [
  { value: 'ALL', label: 'Tất cả hồ sơ' },
  { value: 'PASSED_ONLY', label: 'Chỉ hồ sơ có kết quả đạt' },
];

const RESULT_OPTIONS: readonly ChipOption<ResultFilter>[] = [
  { value: '', label: 'Mọi kết quả' },
  { value: 'PASSED', label: 'Đạt' },
  { value: 'FAILED', label: 'Không đạt' },
];

const HINT =
  'Không bắt buộc. Đưa sẵn huynh trưởng từ các khóa tiên quyết đã kết thúc (khóa thuộc loại tiên quyết của loại khóa đang chọn) vào danh sách tham dự của khóa này khi bấm lưu, không cần đăng ký lại. Mặc định chỉ hiện các khóa tổ chức trong vòng 2 năm tính từ năm tổ chức của khóa này; gõ tên khóa vào ô tìm kiếm để xem khóa khác. Hồ sơ vào thẳng danh sách tham dự (đã duyệt); khóa bật "Tự gửi email thông tin tham dự" thì người vừa được sao chép sẽ được gửi email ngay. Huynh trưởng đã có trong khóa hoặc không sao chép được sẽ tự bỏ qua.';

const sourceLabel = (source: CopySource) =>
  [
    source.courseName,
    source.hostYear ? `Năm tổ chức ${source.hostYear}` : '',
    `${source.participantCount} hồ sơ (${source.passedCount} đạt)`,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * Ô "Sao chép danh sách tham dự" của form khóa (như course-copy-sources-field của web): chọn các khóa tiên quyết đã kết
 * thúc, chọn cách sao chép (tất cả hoặc chỉ hồ sơ đạt) hoặc chọn riêng từng huynh trưởng; hiện ước tính số hồ sơ.
 * Giá trị của ô là chuỗi JSON `CopyState`; form gửi phần này lên BE khi lưu.
 */
export function CopyParticipantsField({
  value,
  values,
  onChange,
  error,
  locked,
}: CustomFieldProps) {
  const gateway = useResourceGateway();
  const state = useMemo(() => parseCopyState(value), [value]);
  const [keyword, setKeyword] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const courseCode = String(values.courseCode ?? '');
  const courseTypeCode = String(values.courseTypeCode ?? '');
  const hostYearText = String(values.hostYear ?? '') || String(values.startDate ?? '').slice(0, 4);
  const targetYear = /^\d{4}$/.test(hostYearText) ? Number(hostYearText) : null;

  const sourcesQuery = useQuery({
    queryKey: ['course-copy-sources', courseCode, courseTypeCode],
    enabled: courseCode !== '' || courseTypeCode !== '',
    queryFn: () =>
      gateway.call<CopySource[]>('GET', '/training/courses/copy-sources', {
        query: {
          courseCode: courseCode || undefined,
          courseTypeCode: courseTypeCode || undefined,
        },
      }),
  });
  const sources = useMemo(() => sourcesQuery.data ?? [], [sourcesQuery.data]);
  const searching = keyword.trim() !== '';
  // Không tìm kiếm: chỉ khóa trong vòng 2 năm (khóa đã chọn luôn hiện); có tìm kiếm: tìm trong mọi khóa nguồn.
  const visible = useMemo(
    () =>
      sources.filter((source) =>
        searching
          ? matchesSource(source, keyword)
          : inYearWindow(source, targetYear) || state.codes.includes(source.courseCode),
      ),
    [sources, searching, keyword, targetYear, state.codes],
  );
  const hiddenCount = sources.length - visible.length;
  const picked = state.leaderIds !== undefined;
  const estimate = estimateCopyCount(sources, state.codes, state.mode);

  const update = (next: Partial<typeof state>) =>
    onChange(stringifyCopyState({ ...state, ...next }));
  const toggleSource = (code: string) =>
    // Đổi khóa nguồn thì danh sách hồ sơ chọn riêng không còn đúng: quay về sao chép theo cách đã chọn.
    update({
      codes: state.codes.includes(code)
        ? state.codes.filter((item) => item !== code)
        : [...state.codes, code],
      leaderIds: undefined,
    });

  return (
    <View style={{ gap: 8 }}>
      <FieldLabel label="Khóa tiên quyết" hint={HINT} />
      {sourcesQuery.isPending && sourcesQuery.fetchStatus !== 'idle' ? <LoadingState /> : null}
      {sourcesQuery.isError ? (
        <Banner tone="danger" message={errorMessage(sourcesQuery.error)} />
      ) : null}
      {sources.length > 8 || searching ? (
        <TextField
          label="Tìm khóa"
          value={keyword}
          onChangeText={setKeyword}
          placeholder="Tên khóa, năm, loại khóa"
        />
      ) : null}
      {visible.map((source) => (
        <CheckboxRow
          key={source.courseCode}
          label={sourceLabel(source)}
          checked={state.codes.includes(source.courseCode)}
          onChange={() => !locked && toggleSource(source.courseCode)}
        />
      ))}
      {!sourcesQuery.isPending && sources.length === 0 ? (
        <Text variant="secondary" tone="muted">
          Chưa có khóa tiên quyết nào để sao chép.
        </Text>
      ) : null}
      {!searching && hiddenCount > 0 ? (
        <Text variant="secondary" tone="muted">
          {`Đang hiện các khóa tổ chức trong vòng ${SOURCE_YEAR_WINDOW} năm tính từ năm tổ chức của khóa này; còn ${hiddenCount} khóa khác. Gõ tên khóa vào ô tìm kiếm để xem.`}
        </Text>
      ) : null}

      {state.codes.length > 0 ? (
        <>
          <Text variant="label">Cách sao chép</Text>
          {picked ? (
            <Text variant="secondary" tone="muted">
              Đang chọn riêng từng hồ sơ nên không đổi được cách sao chép.
            </Text>
          ) : (
            <FilterChips
              options={MODE_OPTIONS}
              value={state.mode}
              onChange={(mode) => update({ mode })}
            />
          )}
          <Text variant="secondary" tone="textSecondary" accessibilityLiveRegion="polite">
            {picked
              ? `Đã chọn riêng ${state.leaderIds?.length ?? 0} hồ sơ sẽ được sao chép vào danh sách tham dự khi bấm lưu.`
              : `Đã chọn ${state.codes.length} khóa tiên quyết, tối đa ${estimate} hồ sơ sẽ được sao chép vào danh sách tham dự khi bấm lưu.`}
          </Text>
          <Button
            label={picked ? 'Sửa hồ sơ đã chọn' : 'Chọn hồ sơ cụ thể'}
            variant="outline"
            size="sm"
            fullWidth={false}
            onPress={() => setPickerOpen(true)}
          />
          {picked ? (
            <Button
              label="Bỏ chọn riêng"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => update({ leaderIds: undefined })}
            />
          ) : null}
        </>
      ) : null}
      {error ? (
        <Text variant="secondary" tone="danger">
          {error}
        </Text>
      ) : null}

      <LeaderPickerSheet
        visible={pickerOpen}
        courseCode={courseCode}
        courseTypeCode={courseTypeCode}
        sourceCodes={state.codes}
        passedOnly={state.mode === 'PASSED_ONLY'}
        initial={state.leaderIds}
        onClose={() => setPickerOpen(false)}
        onConfirm={(leaderIds) => {
          update({ leaderIds });
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

/** Chọn từng huynh trưởng trong danh sách tham dự của các khóa nguồn (như copy-leaders-dialog của web). */
function LeaderPickerSheet({
  visible,
  courseCode,
  courseTypeCode,
  sourceCodes,
  passedOnly,
  initial,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  courseCode: string;
  courseTypeCode: string;
  sourceCodes: string[];
  passedOnly: boolean;
  initial: string[] | undefined;
  onClose: () => void;
  onConfirm: (leaderIds: string[]) => void;
}) {
  const gateway = useResourceGateway();
  const query = useQuery({
    queryKey: ['course-copy-candidates', courseCode, courseTypeCode, sourceCodes],
    enabled: visible && sourceCodes.length > 0 && (courseCode !== '' || courseTypeCode !== ''),
    queryFn: () =>
      gateway.call<CopyCandidate[]>('GET', '/training/courses/copy-sources/candidates', {
        query: {
          courseCode: courseCode || undefined,
          courseTypeCode: courseTypeCode || undefined,
          sourceCourseCodes: sourceCodes,
        },
      }),
  });
  const candidates = useMemo(() => query.data ?? [], [query.data]);
  // Chưa chạm vào ô nào thì lấy lựa chọn mặc định; sau khi người dùng chọn thì giữ theo người dùng.
  const [edited, setEdited] = useState<string[] | null>(null);
  const [keyword, setKeyword] = useState('');
  const [result, setResult] = useState<ResultFilter>('');
  const selected = useMemo(
    () => new Set(edited ?? initial ?? defaultLeaderSelection(candidates, passedOnly)),
    [edited, initial, candidates, passedOnly],
  );
  const visibleRows = useMemo(
    () => candidates.filter((item) => matchesCandidate(item, keyword, result)),
    [candidates, keyword, result],
  );
  const selectable = visibleRows.filter((item) => !item.blockedReason);
  const allSelected =
    selectable.length > 0 && selectable.every((item) => selected.has(item.leaderId));
  const chosen = [...selected].filter((id) =>
    candidates.some((item) => item.leaderId === id && !item.blockedReason),
  );

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setEdited([...next]);
  };
  const toggleVisible = () => {
    const next = new Set(selected);
    selectable.forEach((item) =>
      allSelected ? next.delete(item.leaderId) : next.add(item.leaderId),
    );
    setEdited([...next]);
  };

  return (
    <BottomSheet
      visible={visible}
      title="Chọn hồ sơ huynh trưởng để sao chép"
      onClose={onClose}
      footer={
        <>
          <Button
            label={`Xác nhận chọn (${chosen.length})`}
            disabled={chosen.length === 0}
            onPress={() => onConfirm(chosen)}
          />
          <Button label="Hủy" variant="ghost" size="sm" onPress={onClose} />
        </>
      }
    >
      <Text variant="secondary" tone="muted">
        Tích chọn từng huynh trưởng cần đưa vào danh sách tham dự của khóa. Hồ sơ sao chép vào thẳng
        danh sách (đã duyệt) khi bạn lưu khóa.
      </Text>
      <TextField
        label="Tìm huynh trưởng"
        value={keyword}
        onChangeText={setKeyword}
        placeholder="Tên, giáo xứ, giáo hạt hoặc khóa tiên quyết"
      />
      <FilterChips options={RESULT_OPTIONS} value={result} onChange={setResult} />
      <Button
        label={allSelected ? 'Bỏ chọn danh sách này' : 'Chọn cả danh sách này'}
        variant="outline"
        size="sm"
        disabled={selectable.length === 0}
        onPress={toggleVisible}
      />
      {query.isPending && query.fetchStatus !== 'idle' ? <LoadingState /> : null}
      {query.isError ? <Banner tone="danger" message={errorMessage(query.error)} /> : null}
      {query.data && candidates.length === 0 ? (
        <Text variant="secondary" tone="muted">
          Các khóa tiên quyết đã chọn chưa có hồ sơ nào để sao chép.
        </Text>
      ) : null}
      {query.data && candidates.length > 0 && visibleRows.length === 0 ? (
        <Text variant="secondary" tone="muted">
          Không có hồ sơ nào khớp bộ lọc.
        </Text>
      ) : null}
      {visibleRows.map((item) => {
        const blocked = Boolean(item.blockedReason);
        const name = [item.holyName, item.fullName].filter(Boolean).join(' ');
        const place = [item.parishName, item.deaneryName].filter(Boolean).join(' · ');
        return (
          <View key={item.leaderId} style={{ opacity: blocked ? 0.6 : 1 }}>
            <CheckboxRow
              label={[
                name,
                place,
                `Khóa tiên quyết: ${item.sourceCourseName ?? ''}`,
                item.finalResult === 'PASSED' ? 'Đạt' : 'Không đạt',
                blocked ? `Không sao chép được: ${item.blockedReason}` : '',
              ]
                .filter(Boolean)
                .join(' · ')}
              checked={selected.has(item.leaderId) && !blocked}
              onChange={() => !blocked && toggle(item.leaderId)}
            />
          </View>
        );
      })}
      <Text variant="secondary" tone="textSecondary">
        {`Đã chọn ${chosen.length} / ${candidates.filter((item) => !item.blockedReason).length} hồ sơ`}
      </Text>
    </BottomSheet>
  );
}
