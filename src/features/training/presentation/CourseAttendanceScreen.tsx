import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { formatDateTime } from '@/core/domain/date-format';
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
import { FilterChips } from '@/shared/ui/FilterChips';
import { InfoRow } from '@/shared/ui/InfoRow';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Screen } from '@/shared/ui/Screen';
import { SwitchRow } from '@/shared/ui/SwitchRow';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { useToast } from '@/shared/ui/Toast';

import { isCourseEnded } from '../domain/course-state';
import { formatVnd } from '../domain/course-fee';
import { buildInvitationBody, invitationSummary, type InvitationJob } from '../domain/invitation';
import { canActOnCourse, type TrainingSubject } from '../domain/training-permissions';
import { FeeCheckRow } from './FeeCheckRow';
import { useFeePayments } from './use-fee-payments';

interface Summary {
  attendanceEnabled: boolean;
  autoSendInvitation: boolean;
  totalParticipants: number;
  checkedIn: number;
  notCheckedIn: number;
  invitationSent: number;
  invitationPending: number;
  invitationFailed: number;
  withoutEmail: number;
  /** Lệ phí (khóa có thu lệ phí), tính trên danh sách tham dự hiện tại. */
  feeEnabled?: boolean;
  feeAmount?: number | null;
  feePaidCount?: number;
}

type CheckChoice = 'all' | 'yes' | 'no';

const CHECK_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'yes', label: 'Đã điểm danh' },
  { value: 'no', label: 'Chưa điểm danh' },
] as const;

type FeeChoice = 'all' | 'no' | 'yes';

const FEE_OPTIONS = [
  { value: 'all', label: 'Mọi lệ phí' },
  { value: 'no', label: 'Chưa đóng tiền' },
  { value: 'yes', label: 'Đã đóng tiền' },
] as const;

/** Tên hiển thị của một dòng điểm danh (BE trả holyName / fullName, khác dòng hồ sơ có leaderHolyName / leaderFullName). */
const personName = (row: ResourceRow) =>
  [text(row, 'holyName'), text(row, 'fullName')].filter(Boolean).join(' ');

const POLL_MS = 1500;
const POLL_MAX = 400;

/**
 * Điểm danh và thẻ tham dự của một khóa: số liệu, danh sách có lọc, điểm danh/hủy điểm danh thủ công, mở màn quét QR
 * và gửi email thông tin tham dự (chạy nền, theo dõi tới khi xong).
 */
export function CourseAttendanceScreen({
  courseCode,
  subject,
}: {
  courseCode: string | undefined;
  subject: PermissionSubject | null;
}) {
  const gateway = useResourceGateway();
  const toast = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const code = courseCode ?? '';
  const enc = encodeURIComponent(code);
  const [search, setSearch] = useState('');
  const [check, setCheck] = useState<CheckChoice>('all');
  const [feeFilter, setFeeFilter] = useState<FeeChoice>('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebouncedValue(search.trim());

  const course = useQuery({
    queryKey: ['course-brief', code],
    queryFn: () => gateway.get('/training/courses', code),
    enabled: code !== '',
  });
  const summary = useQuery({
    queryKey: ['course-attendance', code, 'summary'],
    queryFn: () => gateway.call<Summary>('GET', `/training/courses/${enc}/attendance/summary`),
    enabled: code !== '',
  });
  const people = useInfiniteQuery({
    queryKey: ['course-attendance', code, 'list', debounced, check, feeFilter],
    initialPageParam: 0,
    enabled: code !== '',
    queryFn: ({ pageParam }) =>
      gateway.call<{ content?: ResourceRow[]; last?: boolean; number?: number }>(
        'GET',
        `/training/courses/${enc}/attendance/participants`,
        {
          query: {
            page: pageParam,
            size: 20,
            search: debounced || undefined,
            checkedIn: check === 'all' ? undefined : check === 'yes',
            feePaid: feeFilter === 'all' ? undefined : feeFilter === 'yes',
          },
        },
      ),
    getNextPageParam: (last) => (last.last === false ? (last.number ?? 0) + 1 : undefined),
  });

  // Đóng lệ phí: tích là tự lưu qua hàng đợi (xem domain/fee-payment-queue), thành công không báo, lỗi thì trả về như cũ.
  const feeQueue = useFeePayments();

  if (!code)
    return (
      <Screen>
        <Banner tone="danger" message="Thiếu mã khóa huấn luyện." />
      </Screen>
    );

  const user = subject as TrainingSubject | null;
  const canScan = canActOnCourse(user, course.data, 'scan');
  const canInvite =
    canActOnCourse(user, course.data, 'approve') && course.data?.courseFinished !== true;
  const rows = (people.data?.pages ?? []).flatMap((page) => page.content ?? []);
  const data = summary.data;

  // Lệ phí: khóa thu phí thì có dải tổng hợp, bộ lọc và ô Đã đóng tiền. Ghi nhận dùng quyền quét điểm danh, mở đến khi khóa kết thúc.
  const feeEnabled = course.data?.feeEnabled === true;
  const feeAmount = data?.feeAmount ?? (typeof course.data?.feeAmount === 'number' ? course.data.feeAmount : 0);
  const canMarkFee =
    canScan && course.data !== undefined && course.data.status !== false && !isCourseEnded(course.data);
  const listAt = people.dataUpdatedAt;
  const summaryAt = summary.dataUpdatedAt;
  const feeParticipants = data?.totalParticipants ?? 0;
  const feePaidCount = Math.min(
    Math.max((data?.feePaidCount ?? 0) + feeQueue.delta(summaryAt), 0),
    feeParticipants,
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['course-attendance', code] });

  const toggleCheckIn = async (row: ResourceRow) => {
    const id = text(row, 'id');
    setBusyId(id);
    setError(null);
    try {
      await gateway.call(
        'PUT',
        `/training/courses/${enc}/attendance/participants/${encodeURIComponent(id)}`,
        {
          body: { checkedIn: !row.checkedInAt },
        },
      );
      await refresh();
      const who = personName(row);
      toast.success(row.checkedInAt ? `Đã bỏ điểm danh ${who}` : `Đã điểm danh ${who}`);
    } catch (exception) {
      setError(errorMessage(exception));
      toast.error(errorMessage(exception));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen
      onRefresh={() => void refresh()}
      refreshing={summary.isRefetching}
      onEndReached={() => {
        if (people.hasNextPage && !people.isFetchingNextPage) void people.fetchNextPage();
      }}
      loadingMore={people.isFetchingNextPage}
      footer={
        canScan || canInvite ? (
          <>
            {canScan ? (
              <Button
                label="Quét mã QR điểm danh"
                onPress={() => router.push(`/course-scan?course=${enc}` as Href)}
              />
            ) : null}
            {canInvite ? (
              <Button
                label="Gửi email thông tin tham dự"
                variant="outline"
                onPress={() => setInviteOpen(true)}
              />
            ) : null}
          </>
        ) : undefined
      }
    >
      <Text variant="title" accessibilityRole="header">
        {text(course.data ?? {}, 'courseName') || 'Điểm danh'}
      </Text>
      {data && !data.attendanceEnabled ? (
        <Banner
          tone="info"
          message="Khóa này chưa bật điểm danh bằng mã QR. Bật ở phần sửa khóa để có mã QR cho từng hồ sơ."
        />
      ) : null}
      {error ? <Banner tone="danger" message={error} /> : null}
      {summary.isError ? <Banner tone="danger" message={errorMessage(summary.error)} /> : null}

      {data ? (
        <Card>
          <View style={{ gap: 8 }}>
            <InfoRow label="Tham dự viên" value={fmtNumber(data.totalParticipants)} />
            <InfoRow
              label="Đã / chưa điểm danh"
              value={`${fmtNumber(data.checkedIn)} / ${fmtNumber(data.notCheckedIn)}`}
            />
            <InfoRow
              label="Email: đã gửi / chờ / lỗi / không có email"
              value={`${data.invitationSent} / ${data.invitationPending} / ${data.invitationFailed} / ${data.withoutEmail}`}
            />
          </View>
        </Card>
      ) : null}

      {feeEnabled && data ? (
        <FeeSummaryCard
          amount={feeAmount}
          participantCount={feeParticipants}
          paidCount={feePaidCount}
        />
      ) : null}

      <TextField
        label="Tìm kiếm"
        value={search}
        onChangeText={setSearch}
        placeholder="Tên, giáo xứ"
        autoCapitalize="none"
      />
      <FilterChips options={CHECK_OPTIONS} value={check} onChange={setCheck} />
      {feeEnabled ? <FilterChips options={FEE_OPTIONS} value={feeFilter} onChange={setFeeFilter} /> : null}
      {people.isPending ? <LoadingState /> : null}
      {rows.map((row) => {
        const checkedIn = Boolean(row.checkedInAt);
        return (
          <Card key={text(row, 'id')}>
            <View style={{ gap: 4 }}>
              <Text variant="bodyStrong">{personName(row)}</Text>
              <Text variant="secondary" tone="textSecondary">
                {[text(row, 'parishName'), text(row, 'deaneryName')].filter(Boolean).join(' · ')}
              </Text>
              {text(row, 'teamName') ? (
                <Text variant="secondary" tone="muted">{`Đội: ${text(row, 'teamName')}`}</Text>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                <Badge
                  label={
                    checkedIn
                      ? `Đã điểm danh ${formatDateTime(text(row, 'checkedInAt'))}`
                      : 'Chưa điểm danh'
                  }
                  tone={checkedIn ? 'success' : 'neutral'}
                />
                {feeEnabled && !canMarkFee ? (
                  <Badge
                    label={
                      feeQueue.paidOf(text(row, 'id'), Boolean(row.feePaidAt), listAt)
                        ? 'Đã đóng tiền'
                        : 'Chưa đóng tiền'
                    }
                    tone={
                      feeQueue.paidOf(text(row, 'id'), Boolean(row.feePaidAt), listAt)
                        ? 'success'
                        : 'neutral'
                    }
                  />
                ) : null}
                {text(row, 'emailProblem') ? (
                  <Badge label={text(row, 'emailProblem')} tone="warning" />
                ) : text(row, 'invitationSentAt') ? (
                  <Badge label="Đã gửi email" tone="info" />
                ) : null}
              </View>
              {text(row, 'invitationError') ? (
                <Text variant="secondary" tone="danger">
                  {text(row, 'invitationError')}
                </Text>
              ) : null}
              {(canScan && data?.attendanceEnabled) || (feeEnabled && canMarkFee) ? (
                // Hàng thao tác: điểm danh và Đã đóng tiền nằm cạnh nhau, mỗi nút một nửa bề ngang, chạm một tay.
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  {canScan && data?.attendanceEnabled ? (
                    <View style={{ flex: 1 }}>
                      <Button
                        label={checkedIn ? 'Hủy điểm danh' : 'Điểm danh'}
                        variant={checkedIn ? 'outline' : 'primary'}
                        size="sm"
                        loading={busyId === text(row, 'id')}
                        onPress={() => void toggleCheckIn(row)}
                      />
                    </View>
                  ) : null}
                  {feeEnabled && canMarkFee ? (
                    <View style={{ flex: 1 }}>
                      <FeeCheckRow
                        person={personName(row)}
                        checked={feeQueue.paidOf(text(row, 'id'), Boolean(row.feePaidAt), listAt)}
                        busy={feeQueue.busy(text(row, 'id'))}
                        onChange={(paid) =>
                          feeQueue.toggle(
                            text(row, 'id'),
                            paid,
                            { paid: Boolean(row.feePaidAt), snapshotAt: listAt },
                            { label: personName(row), context: code },
                          )
                        }
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </Card>
        );
      })}
      {people.data && rows.length === 0 ? (
        <Text variant="secondary" tone="muted">
          Không có tham dự viên phù hợp.
        </Text>
      ) : null}

      <InviteSheet
        visible={inviteOpen}
        code={code}
        attendanceEnabled={data?.attendanceEnabled === true}
        onClose={() => setInviteOpen(false)}
        onDone={() => void refresh()}
      />
    </Screen>
  );
}

/**
 * Dải tổng hợp lệ phí gọn: tổng tiền, đã đóng, còn thiếu và số người chưa đóng, xếp 2 × 2. Số liệu tính trên danh sách tham
 * dự hiện tại và đã cộng phần thay đổi chưa lưu xong, nên đổi ngay khi chạm ô đóng tiền.
 */
function FeeSummaryCard({
  amount,
  participantCount,
  paidCount,
}: {
  amount: number;
  participantCount: number;
  paidCount: number;
}) {
  const total = amount * participantCount;
  const paidTotal = amount * paidCount;
  const remaining = total - paidTotal;
  const unpaid = Math.max(participantCount - paidCount, 0);
  const cells: { label: string; value: string; tone?: 'success' | 'warning' }[] = [
    { label: 'Tổng tiền', value: formatVnd(total) },
    { label: 'Đã đóng', value: formatVnd(paidTotal), tone: 'success' },
    { label: 'Còn thiếu', value: formatVnd(remaining), tone: remaining > 0 ? 'warning' : undefined },
    { label: 'Chưa đóng', value: `${fmtNumber(unpaid)} người` },
  ];
  return (
    <Card>
      <View accessibilityLabel="Tổng hợp lệ phí" style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 }}>
        {cells.map((cell) => (
          <View key={cell.label} style={{ width: '50%', paddingRight: 8 }}>
            <Text variant="label" tone="muted">
              {cell.label}
            </Text>
            <Text variant="bodyStrong" tone={cell.tone ?? 'foreground'}>
              {cell.value}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function InviteSheet({
  visible,
  code,
  attendanceEnabled,
  onClose,
  onDone,
}: {
  visible: boolean;
  code: string;
  attendanceEnabled: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const gateway = useResourceGateway();
  const [includeQr, setIncludeQr] = useState(true);
  const [resend, setResend] = useState(false);
  const [running, setRunning] = useState(false);
  const [job, setJob] = useState<InvitationJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seen, setSeen] = useState(false);
  if (visible !== seen) {
    setSeen(visible);
    if (visible) {
      setJob(null);
      setError(null);
      setIncludeQr(attendanceEnabled);
      setResend(false);
    }
  }
  const enc = encodeURIComponent(code);

  const send = async () => {
    setRunning(true);
    setError(null);
    setJob(null);
    try {
      let current = await gateway.call<InvitationJob>(
        'POST',
        `/training/courses/${enc}/invitations/send`,
        {
          body: buildInvitationBody({ includeQr: includeQr && attendanceEnabled, resend }),
        },
      );
      // Gửi chạy nền: hỏi trạng thái tới khi hết PENDING.
      for (let attempt = 0; attempt < POLL_MAX && current.status === 'PENDING'; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        current = await gateway.call<InvitationJob>(
          'GET',
          `/training/courses/${enc}/invitations/jobs/${encodeURIComponent(current.jobId)}`,
        );
      }
      if (current.status === 'PENDING')
        throw new Error('Quá thời gian chờ xử lý, vui lòng thử lại sau.');
      setJob(current);
      onDone();
    } catch (exception) {
      setError(errorMessage(exception));
    } finally {
      setRunning(false);
    }
  };

  const summary = job ? invitationSummary(job) : null;

  return (
    <BottomSheet
      visible={visible}
      title="Gửi email thông tin tham dự"
      onClose={onClose}
      footer={
        <>
          <Button label="Gửi email" loading={running} onPress={() => void send()} />
          <Button label="Đóng" variant="ghost" size="sm" onPress={onClose} />
        </>
      }
    >
      <Text variant="body" tone="textSecondary">
        Email gồm tên thánh, họ tên, giáo xứ, giáo hạt, tên khóa và thời gian tổ chức. Gửi cho mọi
        tham dự viên của khóa.
      </Text>
      <SwitchRow
        label="Kèm mã QR điểm danh"
        hint={attendanceEnabled ? undefined : 'Khóa chưa bật điểm danh bằng mã QR.'}
        value={includeQr && attendanceEnabled}
        disabled={!attendanceEnabled}
        onChange={setIncludeQr}
      />
      <SwitchRow
        label="Gửi lại cho người đã nhận"
        hint="Tắt: chỉ gửi cho người chưa được gửi."
        value={resend}
        onChange={setResend}
      />
      {summary ? (
        <Banner tone={summary.failed > 0 ? 'warning' : 'info'} message={summary.message} />
      ) : null}
      {summary?.issues.map((issue) => (
        <Text key={issue.key} variant="secondary" tone="muted">
          {issue.text}
        </Text>
      ))}
      {error ? <Banner tone="danger" message={error} /> : null}
    </BottomSheet>
  );
}
