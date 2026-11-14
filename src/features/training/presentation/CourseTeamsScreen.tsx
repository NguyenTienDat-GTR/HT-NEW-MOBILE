import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { fmtNumber } from '@/core/domain/number-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { text } from '@/shared/resource/row';
import type { PermissionSubject } from '@/shared/resource/types';
import { Badge } from '@/shared/ui/Badge';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmSheet } from '@/shared/ui/ConfirmSheet';
import { InfoRow } from '@/shared/ui/InfoRow';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Screen } from '@/shared/ui/Screen';
import { SelectField } from '@/shared/ui/SelectField';
import { SwitchRow } from '@/shared/ui/SwitchRow';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import {
  buildDivideBody,
  suggestedTeamCount,
  validateDivide,
  type DivideDraft,
} from '../domain/team-divide';
import { canActOnCourse, type TrainingSubject } from '../domain/training-permissions';

import { leaderName, unitOf } from './participation-common';

interface TeamSummary {
  teamName: string;
  total: number;
  male: number;
  female: number;
  other: number;
  units: number;
}
interface Overview {
  totalParticipants: number;
  male: number;
  female: number;
  dividedParticipants: number;
  teams: TeamSummary[];
}

const baseKey = (course: string) => ['course-teams', course] as const;

/**
 * Chia đội của một khóa: tổng quan (số người, nam/nữ, từng đội), chia tự động theo số đội và số người mỗi đội,
 * gán tay từng người, xóa chia đội. Người có quyền xem thấy tổng quan; chỉ người duyệt đăng ký của đơn vị sở hữu
 * khóa mới chia/gán/xóa (BE kiểm tra lại).
 */
export function CourseTeamsScreen({
  courseCode,
  subject,
}: {
  courseCode: string | undefined;
  subject: PermissionSubject | null;
}) {
  const gateway = useResourceGateway();
  const queryClient = useQueryClient();
  const code = courseCode ?? '';
  const enc = encodeURIComponent(code);
  const [search, setSearch] = useState('');
  const [team, setTeam] = useState('');
  const [divideOpen, setDivideOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [assigning, setAssigning] = useState<ResourceRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebouncedValue(search.trim());

  const course = useQuery({
    queryKey: ['course-brief', code],
    queryFn: () => gateway.get('/training/courses', code),
    enabled: code !== '',
  });
  const overview = useQuery({
    queryKey: [...baseKey(code), 'overview'],
    queryFn: () => gateway.call<Overview>('GET', `/training/courses/${enc}/teams/overview`),
    enabled: code !== '',
  });
  const people = useInfiniteQuery({
    queryKey: [...baseKey(code), 'people', debounced, team],
    initialPageParam: 0,
    enabled: code !== '',
    queryFn: ({ pageParam }) =>
      gateway.list('/training/participants', {
        page: pageParam,
        size: 20,
        search: debounced,
        searchFields: ['leader.lastName+leader.firstName', 'leader.holyName', 'leader.parish.name'],
        filters: { 'course.courseCode': code, ...(team ? { teamName: team } : {}) },
      }),
    getNextPageParam: (last) => (last.last ? undefined : last.number + 1),
  });

  if (!code)
    return (
      <Screen>
        <Banner tone="danger" message="Thiếu mã khóa huấn luyện." />
      </Screen>
    );

  const manage =
    canActOnCourse(subject as TrainingSubject | null, course.data, 'approve') &&
    course.data?.courseFinished !== true;
  const rows = (people.data?.pages ?? []).flatMap((page) => page.content);
  const teams = overview.data?.teams ?? [];
  const teamOptions = [
    { value: '', label: 'Tất cả đội' },
    ...teams.map((item) => ({ value: item.teamName, label: item.teamName })),
  ];

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: baseKey(code) });
    await queryClient.invalidateQueries({ queryKey: ['resource', 'participants'] });
  };
  const run = async (action: () => Promise<unknown>, after: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
      after();
    } catch (exception) {
      setError(errorMessage(exception));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      onRefresh={() => void refresh()}
      refreshing={overview.isRefetching}
      onEndReached={() => {
        if (people.hasNextPage && !people.isFetchingNextPage) void people.fetchNextPage();
      }}
      loadingMore={people.isFetchingNextPage}
      footer={
        manage ? (
          <>
            <Button label="Chia đội tự động" onPress={() => setDivideOpen(true)} />
            <Button
              label="Xóa chia đội"
              variant="outline"
              disabled={(overview.data?.dividedParticipants ?? 0) === 0}
              onPress={() => setClearOpen(true)}
            />
          </>
        ) : undefined
      }
    >
      <Text variant="title" accessibilityRole="header">
        {text(course.data ?? {}, 'courseName') || 'Chia đội'}
      </Text>
      {error && !divideOpen && !clearOpen && !assigning ? (
        <Banner tone="danger" message={error} />
      ) : null}
      {overview.isError ? <Banner tone="danger" message={errorMessage(overview.error)} /> : null}
      {overview.isPending ? <LoadingState /> : null}

      {overview.data ? (
        <Card>
          <View style={{ gap: 8 }}>
            <InfoRow
              label="Tổng số tham dự viên"
              value={fmtNumber(overview.data.totalParticipants)}
            />
            <InfoRow
              label="Nam / Nữ"
              value={`${fmtNumber(overview.data.male)} / ${fmtNumber(overview.data.female)}`}
            />
            <InfoRow
              label="Đã chia đội"
              value={`${fmtNumber(overview.data.dividedParticipants)} / ${fmtNumber(overview.data.totalParticipants)}`}
            />
          </View>
        </Card>
      ) : null}

      {teams.map((item) => (
        <Card
          key={item.teamName}
          onPress={() => setTeam(item.teamName === team ? '' : item.teamName)}
        >
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {item.teamName}
              </Text>
              <Badge label={`${item.total} người`} tone="info" />
            </View>
            <Text variant="secondary" tone="muted">
              {`Nam ${item.male} · Nữ ${item.female}${item.other ? ` · Khác ${item.other}` : ''} · ${item.units} đơn vị`}
            </Text>
          </View>
        </Card>
      ))}

      <Text variant="heading" accessibilityRole="header">
        Danh sách tham dự
      </Text>
      <TextField
        label="Tìm kiếm"
        value={search}
        onChangeText={setSearch}
        placeholder="Tên, giáo xứ"
        autoCapitalize="none"
      />
      {teams.length > 0 ? (
        <SelectField
          label="Đội"
          value={team}
          options={teamOptions}
          placeholder="Tất cả đội"
          onChange={setTeam}
        />
      ) : null}
      {people.isPending ? <LoadingState /> : null}
      {rows.map((row) => (
        <Card key={text(row, 'id')} onPress={manage ? () => setAssigning(row) : undefined}>
          <View style={{ gap: 2 }}>
            <Text variant="bodyStrong">{leaderName(row)}</Text>
            <Text variant="secondary" tone="textSecondary">
              {unitOf(row)}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              <Badge
                label={text(row, 'teamName') || 'Chưa chia đội'}
                tone={text(row, 'teamName') ? 'success' : 'neutral'}
              />
            </View>
          </View>
        </Card>
      ))}

      <DivideSheet
        visible={divideOpen}
        total={overview.data?.totalParticipants ?? 0}
        busy={busy}
        error={divideOpen ? error : null}
        onClose={() => {
          setDivideOpen(false);
          setError(null);
        }}
        onSubmit={(draft) =>
          void run(
            () =>
              gateway.call('POST', `/training/courses/${enc}/teams/divide`, {
                body: buildDivideBody(draft),
              }),
            () => setDivideOpen(false),
          )
        }
      />
      <ConfirmSheet
        visible={clearOpen}
        title="Xóa chia đội"
        message={error ?? 'Xóa tên đội của mọi hồ sơ trong khóa. Bạn chia lại được sau.'}
        confirmLabel="Xóa chia đội"
        destructive
        loading={busy}
        onCancel={() => {
          setClearOpen(false);
          setError(null);
        }}
        onConfirm={() =>
          void run(
            () => gateway.call('DELETE', `/training/courses/${enc}/teams`),
            () => setClearOpen(false),
          )
        }
      />
      <AssignSheet
        row={assigning}
        teams={teams.map((item) => item.teamName)}
        busy={busy}
        error={assigning ? error : null}
        onClose={() => {
          setAssigning(null);
          setError(null);
        }}
        onSubmit={(teamName) =>
          assigning
            ? void run(
                () =>
                  gateway.call('PATCH', `/training/courses/${enc}/teams/assignments`, {
                    body: { assignments: [{ participationId: text(assigning, 'id'), teamName }] },
                  }),
                () => setAssigning(null),
              )
            : undefined
        }
      />
    </Screen>
  );
}

const EMPTY: DivideDraft = {
  teamCount: '',
  teamSize: '',
  namingMode: 'SEQUENTIAL',
  teamNames: '',
  assignmentMode: 'RANDOM',
  maxUnitsPerTeam: '',
};

function DivideSheet({
  visible,
  total,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  total: number;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (draft: DivideDraft) => void;
}) {
  const [draft, setDraft] = useState<DivideDraft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [seen, setSeen] = useState(false);
  if (visible !== seen) {
    setSeen(visible);
    if (visible) {
      setDraft(EMPTY);
      setErrors({});
    }
  }
  const set = <K extends keyof DivideDraft>(key: K, value: DivideDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const suggestion = suggestedTeamCount(total, Number(draft.teamSize));

  return (
    <BottomSheet
      visible={visible}
      title="Chia đội tự động"
      onClose={onClose}
      footer={
        <>
          <Button
            label="Chia đội"
            loading={busy}
            onPress={() => {
              const found = validateDivide(draft, total);
              setErrors(found);
              if (Object.keys(found).length === 0) onSubmit(draft);
            }}
          />
          <Button label="Hủy" variant="ghost" size="sm" onPress={onClose} />
        </>
      }
    >
      <Text variant="secondary" tone="muted">
        {`Chia ${total} tham dự viên, cân bằng nam nữ. Chia lại sẽ thay thế cách chia hiện có.`}
      </Text>
      <TextField
        label="Số hồ sơ mỗi đội"
        value={draft.teamSize}
        onChangeText={(value) => set('teamSize', value)}
        keyboardType="number-pad"
        error={errors.teamSize}
      />
      <TextField
        label="Số đội"
        value={draft.teamCount}
        onChangeText={(value) => set('teamCount', value)}
        keyboardType="number-pad"
        error={errors.teamCount}
        hint={suggestion > 0 ? `Gợi ý ${suggestion} đội để đủ chỗ cho mọi người.` : undefined}
      />
      <SwitchRow
        label="Đặt tên đội tùy chỉnh"
        hint="Tắt: đội được đặt tên theo số thứ tự."
        value={draft.namingMode === 'CUSTOM'}
        onChange={(on) => set('namingMode', on ? 'CUSTOM' : 'SEQUENTIAL')}
      />
      {draft.namingMode === 'CUSTOM' ? (
        <TextField
          label="Tên các đội (mỗi dòng một tên)"
          value={draft.teamNames}
          onChangeText={(value) => set('teamNames', value)}
          multiline
          error={errors.teamNames}
        />
      ) : null}
      <SwitchRow
        label="Giới hạn số đơn vị mỗi đội"
        hint="Tắt: chia ngẫu nhiên. Bật: mỗi đội gồm tối đa số giáo xứ/giáo hạt bạn nhập."
        value={draft.assignmentMode === 'UNIT_LIMIT'}
        onChange={(on) => set('assignmentMode', on ? 'UNIT_LIMIT' : 'RANDOM')}
      />
      {draft.assignmentMode === 'UNIT_LIMIT' ? (
        <TextField
          label="Số đơn vị tối đa mỗi đội"
          value={draft.maxUnitsPerTeam}
          onChangeText={(value) => set('maxUnitsPerTeam', value)}
          keyboardType="number-pad"
          error={errors.maxUnitsPerTeam}
        />
      ) : null}
      {error ? <Banner tone="danger" message={error} /> : null}
    </BottomSheet>
  );
}

function AssignSheet({
  row,
  teams,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  row: ResourceRow | null;
  teams: string[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (teamName: string | null) => void;
}) {
  const [picked, setPicked] = useState('');
  const [custom, setCustom] = useState('');
  const [seen, setSeen] = useState<ResourceRow | null>(null);
  if (row !== seen) {
    setSeen(row);
    setPicked(row ? text(row, 'teamName') : '');
    setCustom('');
  }
  const target = custom.trim() || picked;

  return (
    <BottomSheet
      visible={row !== null}
      title={row ? leaderName(row) : ''}
      onClose={onClose}
      footer={
        <>
          <Button label="Lưu" loading={busy} onPress={() => onSubmit(target || null)} />
          <Button label="Hủy" variant="ghost" size="sm" onPress={onClose} />
        </>
      }
    >
      <SelectField
        label="Chọn đội"
        value={picked}
        options={teams.map((name) => ({ value: name, label: name }))}
        placeholder="Chưa chia đội"
        onChange={(value) => {
          setPicked(value);
          setCustom('');
        }}
      />
      <TextField
        label="Hoặc đặt sang đội mới"
        value={custom}
        onChangeText={setCustom}
        maxLength={150}
        hint="Bỏ trống cả hai ô để đưa khỏi đội."
      />
      {error ? <Banner tone="danger" message={error} /> : null}
    </BottomSheet>
  );
}
