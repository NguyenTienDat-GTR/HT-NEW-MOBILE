import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { formatDate } from '@/core/domain/date-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { resourceKey } from '@/shared/resource/use-resource';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { flag, joinParts, text } from '@/shared/resource/row';
import type { PermissionSubject } from '@/shared/resource/types';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { CheckboxRow } from '@/shared/ui/CheckboxRow';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Screen } from '@/shared/ui/Screen';
import { SelectField } from '@/shared/ui/SelectField';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import {
  buildRegistrationBody,
  missingReasons,
  type RegistrationEntry,
} from '../domain/registration-body';
import { canSubmitRegistration } from '../domain/training-permissions';

type Mode = 'ELIGIBLE' | 'EXCEPTION';

interface PageDto {
  content?: ResourceRow[];
  last?: boolean;
  number?: number;
  totalElements?: number;
}

export interface RegistrationSubmitScreenProps {
  subject: PermissionSubject | null;
  presetCourse?: string;
  onSaved: () => void;
}

const entryOf = (row: ResourceRow): RegistrationEntry => ({
  id: text(row, 'id'),
  name: joinParts([text(row, 'holyName'), text(row, 'fullName')], ' '),
  unit: joinParts([text(row, 'parishName'), text(row, 'deaneryName')]),
  offTarget: flag(row, 'offTarget'),
  reason: '',
});

/**
 * Gửi đăng ký tham dự: chọn khóa còn mở đăng ký, lập danh sách đủ điều kiện và danh sách ngoại lệ (kèm lý do từng
 * người), hồ sơ ngoài đợt của khóa giáo phận cũng cần lý do riêng. Một lần gửi cho cả danh sách.
 */
export function RegistrationSubmitScreen({
  subject,
  presetCourse,
  onSaved,
}: RegistrationSubmitScreenProps) {
  const gateway = useResourceGateway();
  const queryClient = useQueryClient();
  const [sender, setSender] = useState('');
  const [course, setCourse] = useState(presetCourse ?? '');
  const [standard, setStandard] = useState<RegistrationEntry[]>([]);
  const [exceptions, setExceptions] = useState<RegistrationEntry[]>([]);
  const [picker, setPicker] = useState<Mode | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const senders = useQuery({
    queryKey: ['registration-senders'],
    queryFn: () =>
      gateway.call<{ code: string; label: string }[]>(
        'GET',
        '/training/courses/registration-senders',
      ),
    staleTime: 5 * 60_000,
  });
  const courses = useQuery({
    queryKey: ['registrable-courses', sender],
    queryFn: () =>
      gateway.call<ResourceRow[]>('GET', '/training/courses/registrable', {
        query: { senderType: sender || undefined },
      }),
  });

  if (!canSubmitRegistration(subject))
    return (
      <Screen>
        <Banner tone="warning" message="Tài khoản của bạn không có quyền gửi đăng ký." />
      </Screen>
    );

  const courseOptions = (courses.data ?? []).map((item) => ({
    value: text(item, 'courseCode'),
    label: text(item, 'courseName'),
  }));
  const senderOptions = (senders.data ?? []).map((item) => ({
    value: item.code,
    label: item.label,
  }));
  const used = new Set([...standard, ...exceptions].map((entry) => entry.id));

  const patch = (
    list: RegistrationEntry[],
    set: (next: RegistrationEntry[]) => void,
    id: string,
    reason: string,
  ) => set(list.map((entry) => (entry.id === id ? { ...entry, reason } : entry)));

  const submit = async () => {
    setError(null);
    const problem = missingReasons(standard, exceptions);
    if (!course) return setError('Vui lòng chọn khóa huấn luyện');
    if (problem) return setError(problem);
    setSaving(true);
    try {
      await gateway.call('POST', `/training/courses/${encodeURIComponent(course)}/registrations`, {
        body: buildRegistrationBody(sender, standard, exceptions),
      });
      await queryClient.invalidateQueries({ queryKey: resourceKey('registrations') });
      await queryClient.invalidateQueries({ queryKey: resourceKey('courses') });
      setDone(`Đã gửi ${standard.length + exceptions.length} hồ sơ đăng ký.`);
      setStandard([]);
      setExceptions([]);
      onSaved();
    } catch (exception) {
      setError(errorMessage(exception));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      footer={
        <Button
          label={`Gửi đăng ký (${standard.length + exceptions.length})`}
          loading={saving}
          disabled={standard.length + exceptions.length === 0}
          onPress={() => void submit()}
        />
      }
    >
      {error ? <Banner tone="danger" message={error} /> : null}
      {done ? <Banner tone="info" message={done} /> : null}

      {senderOptions.length > 1 ? (
        <SelectField
          label="Gửi với tư cách"
          value={sender}
          options={senderOptions}
          placeholder="Hệ thống tự chọn theo khóa"
          onChange={(value) => {
            setSender(value);
            setCourse('');
            setStandard([]);
            setExceptions([]);
          }}
        />
      ) : null}
      <SelectField
        label="Khóa huấn luyện"
        value={course}
        options={courseOptions}
        placeholder={courses.isPending ? 'Đang tải…' : 'Chọn khóa đang mở đăng ký'}
        allowClear={false}
        onChange={(value) => {
          setCourse(value);
          setStandard([]);
          setExceptions([]);
        }}
      />

      <ListBlock
        title="Danh sách đăng ký"
        hint="Huynh trưởng đủ điều kiện theo loại khóa và số năm hoạt động của khóa."
        entries={standard}
        disabled={!course}
        onAdd={() => setPicker('ELIGIBLE')}
        onRemove={(id) => setStandard(standard.filter((entry) => entry.id !== id))}
        onReason={(id, reason) => patch(standard, setStandard, id, reason)}
        reasonLabel="Lý do gửi ngoài đợt (bắt buộc)"
        needsReason={(entry) => entry.offTarget}
      />
      <ListBlock
        title="Danh sách ngoại lệ"
        hint="Huynh trưởng chưa đủ điều kiện, mỗi người kèm lý do. Không trùng với danh sách đăng ký."
        entries={exceptions}
        disabled={!course}
        onAdd={() => setPicker('EXCEPTION')}
        onRemove={(id) => setExceptions(exceptions.filter((entry) => entry.id !== id))}
        onReason={(id, reason) => patch(exceptions, setExceptions, id, reason)}
        reasonLabel="Lý do ngoại lệ (bắt buộc)"
        needsReason={() => true}
      />

      <CandidateSheet
        mode={picker}
        course={course}
        sender={sender}
        used={used}
        onClose={() => setPicker(null)}
        onAdd={(entries) => {
          if (picker === 'ELIGIBLE') setStandard([...standard, ...entries]);
          else setExceptions([...exceptions, ...entries]);
          setPicker(null);
        }}
      />
    </Screen>
  );
}

function ListBlock({
  title,
  hint,
  entries,
  disabled,
  onAdd,
  onRemove,
  onReason,
  reasonLabel,
  needsReason,
}: {
  title: string;
  hint: string;
  entries: RegistrationEntry[];
  disabled: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onReason: (id: string, reason: string) => void;
  reasonLabel: string;
  needsReason: (entry: RegistrationEntry) => boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="heading" accessibilityRole="header">
        {`${title} (${entries.length})`}
      </Text>
      <Text variant="secondary" tone="muted">
        {hint}
      </Text>
      {entries.map((entry) => (
        <Card key={entry.id}>
          <View style={{ gap: 8 }}>
            <Text variant="bodyStrong">{entry.name}</Text>
            <Text variant="secondary" tone="textSecondary">
              {entry.unit}
            </Text>
            {needsReason(entry) ? (
              <TextField
                label={reasonLabel}
                value={entry.reason}
                onChangeText={(reason) => onReason(entry.id, reason)}
                multiline
                maxLength={500}
              />
            ) : null}
            <Button
              label="Bỏ khỏi danh sách"
              variant="outline"
              size="sm"
              onPress={() => onRemove(entry.id)}
            />
          </View>
        </Card>
      ))}
      <Button label="Thêm huynh trưởng" variant="outline" disabled={disabled} onPress={onAdd} />
    </View>
  );
}

function CandidateSheet({
  mode,
  course,
  sender,
  used,
  onClose,
  onAdd,
}: {
  mode: Mode | null;
  course: string;
  sender: string;
  used: ReadonlySet<string>;
  onClose: () => void;
  onAdd: (entries: RegistrationEntry[]) => void;
}) {
  const gateway = useResourceGateway();
  const [term, setTerm] = useState('');
  const [picked, setPicked] = useState<Map<string, RegistrationEntry>>(new Map());
  const [seen, setSeen] = useState<Mode | null>(null);
  const debounced = useDebouncedValue(term.trim());
  // Mỗi lần mở sheet bắt đầu từ danh sách chọn rỗng.
  if (mode !== seen) {
    setSeen(mode);
    setPicked(new Map());
    setTerm('');
  }

  const query = useInfiniteQuery({
    queryKey: ['registration-candidates', course, mode, sender, debounced],
    initialPageParam: 0,
    enabled: mode !== null && course !== '',
    queryFn: ({ pageParam }) =>
      gateway.call<PageDto>(
        'GET',
        `/training/courses/${encodeURIComponent(course)}/registration-candidates`,
        {
          query: {
            mode: mode ?? 'ELIGIBLE',
            search: debounced || undefined,
            senderType: sender || undefined,
            page: pageParam,
            size: 20,
          },
        },
      ),
    getNextPageParam: (last) => (last.last === false ? (last.number ?? 0) + 1 : undefined),
  });
  const rows = (query.data?.pages ?? []).flatMap((page) => page.content ?? []);

  const toggle = (row: ResourceRow, checked: boolean) =>
    setPicked((current) => {
      const next = new Map(current);
      if (checked) next.set(text(row, 'id'), entryOf(row));
      else next.delete(text(row, 'id'));
      return next;
    });

  return (
    <BottomSheet
      visible={mode !== null}
      title={mode === 'EXCEPTION' ? 'Chọn huynh trưởng ngoại lệ' : 'Chọn huynh trưởng đủ điều kiện'}
      onClose={onClose}
      footer={
        <>
          <Button
            label={`Thêm ${picked.size} người`}
            disabled={picked.size === 0}
            onPress={() => onAdd([...picked.values()])}
          />
          <Button label="Hủy" variant="ghost" size="sm" onPress={onClose} />
        </>
      }
    >
      <TextField
        label="Tìm kiếm"
        value={term}
        onChangeText={setTerm}
        placeholder="Tên, số điện thoại, giáo xứ…"
        autoCapitalize="none"
      />
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <Banner tone="danger" message={errorMessage(query.error)} /> : null}
      {rows.map((row) => {
        const id = text(row, 'id');
        const taken = used.has(id);
        return (
          <CheckboxRow
            key={id}
            label={`${joinParts([text(row, 'holyName'), text(row, 'fullName')], ' ')} — ${joinParts(
              [
                text(row, 'parishName'),
                formatDate(text(row, 'birthDate')),
                flag(row, 'offTarget') ? 'ngoài đợt' : '',
              ],
            )}${taken ? ' (đã trong danh sách)' : ''}`}
            checked={taken || picked.has(id)}
            onChange={(checked) => (taken ? undefined : toggle(row, checked))}
          />
        );
      })}
      {query.data && rows.length === 0 ? (
        <Text variant="secondary" tone="muted">
          Không có huynh trưởng phù hợp.
        </Text>
      ) : null}
      {query.hasNextPage ? (
        <Button
          label="Tải thêm"
          variant="outline"
          loading={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        />
      ) : null}
    </BottomSheet>
  );
}
