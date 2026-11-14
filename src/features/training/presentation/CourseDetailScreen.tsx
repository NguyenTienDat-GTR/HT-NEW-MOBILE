import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { formatDate, formatDateTime } from '@/core/domain/date-format';
import { fmtNumber } from '@/core/domain/number-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { ToggleSheet } from '@/shared/resource/ResourceDetailScreen';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { count, flag, text } from '@/shared/resource/row';
import type { PermissionSubject, ResourceDefinition } from '@/shared/resource/types';
import { resourceKey, useInvalidateResource } from '@/shared/resource/use-resource';
import { Badge } from '@/shared/ui/Badge';
import { Banner } from '@/shared/ui/Banner';
import { AccordionGroup } from '@/shared/ui/AccordionGroup';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { ConfirmSheet } from '@/shared/ui/ConfirmSheet';
import { ListIcon } from '@/shared/ui/icons';
import { InfoRow } from '@/shared/ui/InfoRow';
import { ListRow } from '@/shared/ui/ListRow';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Screen } from '@/shared/ui/Screen';
import { useTheme } from '@/shared/theme/theme-provider';
import { Text } from '@/shared/ui/Text';

import {
  isCourseEnded,
  ORGANIZING_LABELS,
  ORGANIZING_TONES,
  organizingState,
  REGISTRATION_LABELS,
  REGISTRATION_TONES,
  registrationState,
} from '../domain/course-state';
import { unitLabel } from '../domain/training-labels';
import {
  canActOnCourse,
  canRegisterCourse,
  canSubmitRegistration,
  type TrainingSubject,
} from '../domain/training-permissions';

type Pending = null | 'finish' | 'lock' | 'unlock' | 'open' | 'close';

const MESSAGES: Record<
  Exclude<Pending, null>,
  { title: string; message: string; confirm: string }
> = {
  finish: {
    title: 'Kết thúc khóa',
    message:
      'Kết thúc khóa sẽ chốt kết quả và thăng cấp cho hồ sơ đạt theo quy định. Không hoàn tác được.',
    confirm: 'Kết thúc khóa',
  },
  lock: {
    title: 'Khóa điểm',
    message: 'Sau khi khóa điểm, không ai sửa được điểm của khóa này cho tới khi mở khóa.',
    confirm: 'Khóa điểm',
  },
  unlock: {
    title: 'Mở khóa điểm',
    message: 'Cho phép sửa lại điểm của khóa này.',
    confirm: 'Mở khóa điểm',
  },
  open: { title: 'Mở đăng ký', message: 'Khóa sẽ nhận đăng ký ngay.', confirm: 'Mở đăng ký' },
  close: { title: 'Đóng đăng ký', message: 'Khóa sẽ ngừng nhận đăng ký.', confirm: 'Đóng đăng ký' },
};

export interface CourseDetailScreenProps {
  def: ResourceDefinition;
  id: string;
  subject: PermissionSubject | null;
  onEdit: () => void;
}

const goto = (path: string, course: string) =>
  `${path}?filters=${encodeURIComponent(JSON.stringify({ 'course.courseCode': course }))}` as Href;

/**
 * Chi tiết khóa huấn luyện: thông tin, thời gian đăng ký, chấm điểm; các thao tác theo quyền (sửa, mở/đóng đăng ký,
 * khóa điểm, kết thúc, ngưng) và lối tắt tới đăng ký, duyệt, tham dự, chấm điểm của riêng khóa này.
 */
export function CourseDetailScreen({ def, id, subject, onEdit }: CourseDetailScreenProps) {
  const gateway = useResourceGateway();
  const router = useRouter();
  const { colors, iconSize } = useTheme();
  const invalidate = useInvalidateResource(def);
  const [pending, setPending] = useState<Pending>(null);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: [...resourceKey('courses'), 'row', id],
    queryFn: () => gateway.get('/training/courses', id),
  });
  const course = query.data;

  if (query.isPending)
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  if (query.isError || !course)
    return (
      <Screen onRefresh={() => void query.refetch()}>
        <Banner tone="danger" message={errorMessage(query.error)} />
        <Button label="Thử lại" variant="outline" onPress={() => void query.refetch()} />
      </Screen>
    );

  const user = subject as TrainingSubject | null;
  const code = text(course, 'courseCode');
  const ended = isCourseEnded(course);
  const registration = registrationState(course);
  const organizing = organizingState(course);
  const active = flag(course, 'status');
  const canUpdate = canActOnCourse(user, course, 'update') && !ended && active;
  const canFinish = canActOnCourse(user, course, 'finish') && !ended && active;
  const canLock = canActOnCourse(user, course, 'lockScore') && active;
  const canToggle = canActOnCourse(user, course, 'toggle');
  const canRegister = canRegisterCourse(user, course) && registration === 'OPEN' && active;
  const canSeeParticipants =
    canActOnCourse(user, course, 'read') ||
    canActOnCourse(user, course, 'approve') ||
    canActOnCourse(user, course, 'score');
  const registrationOpen = registration === 'OPEN';
  const encoded = encodeURIComponent(code);

  const steps: { label: string; href: Href }[] = [
    { label: 'Hồ sơ đăng ký', href: goto('/res/registrations', code) },
    ...(canActOnCourse(user, course, 'approve')
      ? [{ label: 'Duyệt đăng ký', href: goto('/res/approvals', code) }]
      : []),
    ...(canSeeParticipants
      ? [
          { label: 'Danh sách tham dự', href: goto('/res/participants', code) },
          { label: 'Chia đội', href: `/res/teams?course=${encoded}` as Href },
          { label: 'Điểm danh và email mời', href: `/res/attendance?course=${encoded}` as Href },
        ]
      : []),
    ...(canActOnCourse(user, course, 'score')
      ? [{ label: 'Chấm điểm', href: goto('/res/scores', code) }]
      : []),
  ];

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await invalidate();
      setPending(null);
    } catch (exception) {
      setError(errorMessage(exception));
    } finally {
      setBusy(false);
    }
  };

  const confirmPending = () => {
    if (pending === 'finish')
      return run(() => gateway.call('POST', `/training/courses/${encoded}/finish`));
    if (pending === 'lock' || pending === 'unlock')
      return run(() =>
        gateway.call('PATCH', `/training/courses/${encoded}/score-lock`, {
          body: { locked: pending === 'lock' },
        }),
      );
    return run(() =>
      gateway.call('PATCH', `/training/courses/${encoded}/registration`, {
        body: { open: pending === 'open' },
      }),
    );
  };

  const components = Array.isArray(course.scoreComponents)
    ? (course.scoreComponents as ResourceRow[])
    : [];
  const targets = Array.isArray(course.targetDeaneries)
    ? (course.targetDeaneries as ResourceRow[]).map((d) => text(d, 'name')).join(', ')
    : '';

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Card>
        <View style={{ gap: 8 }}>
          <Text variant="title" accessibilityRole="header">
            {text(course, 'courseName')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {!active ? <Badge label="Tạm ngưng" tone="warning" /> : null}
            <Badge label={ORGANIZING_LABELS[organizing]} tone={ORGANIZING_TONES[organizing]} />
            <Badge
              label={REGISTRATION_LABELS[registration]}
              tone={REGISTRATION_TONES[registration]}
            />
            {flag(course, 'scoreLocked') ? <Badge label="Đã khóa điểm" tone="warning" /> : null}
          </View>
          <Text variant="secondary" tone="textSecondary">
            {[text(course, 'courseTypeName'), text(course, 'hostYear')].filter(Boolean).join(' · ')}
          </Text>
          {canUpdate ? <Button label="Sửa khóa" variant="outline" onPress={onEdit} /> : null}
          {canRegister && canSubmitRegistration(user) ? (
            <Button
              label="Gửi đăng ký"
              onPress={() => router.push(`/res/registrations/form?course=${encoded}` as Href)}
            />
          ) : null}
        </View>
      </Card>

      {error && pending === null ? <Banner tone="danger" message={error} /> : null}

      <Card>
        <InfoRow
          label="Tham dự viên đã duyệt"
          value={fmtNumber(count(course, 'approvedParticipantCount'))}
        />
      </Card>

      {/* Các bước quy trình của khóa: hamburger ẩn/hiện danh sách, như menu thả xuống của web trên điện thoại. */}
      {steps.length > 0 ? (
        <AccordionGroup
          title="Quy trình huấn luyện"
          icon={<ListIcon size={iconSize.md} color={colors.primary} weight="bold" />}
          count={steps.length}
        >
          {steps.map((step) => (
            <ListRow key={step.label} label={step.label} onPress={() => router.push(step.href)} />
          ))}
        </AccordionGroup>
      ) : null}

      <Card>
        <View style={{ gap: 12 }}>
          <Text variant="heading" accessibilityRole="header">
            Thông tin khóa
          </Text>
          <InfoRow label="Cấp quản lý" value={unitLabel(course.managementUnitType)} />
          <InfoRow
            label="Đơn vị tổ chức"
            value={text(course, 'deaneryName') || text(course, 'dioceseName')}
          />
          <InfoRow label="Địa điểm" value={text(course, 'location')} />
          <InfoRow
            label="Thời gian"
            value={[formatDate(text(course, 'startDate')), formatDate(text(course, 'endDate'))]
              .filter(Boolean)
              .join(' – ')}
          />
          <InfoRow label="Số năm hoạt động" value={text(course, 'yearsActive')} />
          <InfoRow label="Cấp độ yêu cầu" value={text(course, 'requiredCurrentLevelName')} />
          <InfoRow label="Cấp độ khi hoàn thành" value={text(course, 'resultingLevelName')} />
          <InfoRow label="Khóa tiên quyết" value={text(course, 'prerequisiteTypeName')} />
          <InfoRow label="Dành cho giáo hạt" value={targets || 'Tất cả giáo hạt'} />
        </View>
      </Card>

      <Card>
        <View style={{ gap: 12 }}>
          <Text variant="heading" accessibilityRole="header">
            Đăng ký
          </Text>
          <InfoRow
            label="Thời gian đăng ký"
            value={
              flag(course, 'registrationEnabled') || course.registrationEnabled === undefined
                ? [
                    formatDateTime(text(course, 'registrationStartAt')),
                    formatDateTime(text(course, 'registrationEndAt')),
                  ]
                    .filter(Boolean)
                    .join(' → ')
                : 'Không mở đăng ký'
            }
          />
          <InfoRow
            label="Tự động duyệt hồ sơ hợp lệ"
            value={flag(course, 'autoApproveEligible') ? 'Có' : 'Không'}
          />
          <InfoRow
            label="Điểm danh bằng mã QR"
            value={flag(course, 'attendanceEnabled') ? 'Bật' : 'Tắt'}
          />
          {canUpdate && !flag(course, 'pastCourse') && registration !== 'ENDED' ? (
            <Button
              label={registrationOpen ? 'Đóng đăng ký' : 'Mở đăng ký'}
              variant="outline"
              onPress={() => setPending(registrationOpen ? 'close' : 'open')}
            />
          ) : null}
        </View>
      </Card>

      <Card>
        <View style={{ gap: 12 }}>
          <Text variant="heading" accessibilityRole="header">
            Chấm điểm
          </Text>
          <InfoRow label="Điểm đạt" value={text(course, 'passingScore')} />
          <InfoRow
            label="Hiển thị điểm cho giáo xứ và huynh trưởng"
            value={flag(course, 'scoreVisible') ? 'Có' : 'Không'}
          />
          {components.map((item) => (
            <InfoRow
              key={text(item, 'id') || text(item, 'name')}
              label={text(item, 'name')}
              value={`Tối đa ${text(item, 'maxScore')} · hệ số ${text(item, 'coefficient')}${
                item.includeInFinal === false ? ' · không tính tổng kết' : ''
              }`}
            />
          ))}
          {canLock ? (
            <Button
              label={flag(course, 'scoreLocked') ? 'Mở khóa điểm' : 'Khóa điểm'}
              variant="outline"
              onPress={() => setPending(flag(course, 'scoreLocked') ? 'unlock' : 'lock')}
            />
          ) : null}
        </View>
      </Card>

      {text(course, 'additionalNotes') ? (
        <Card>
          <InfoRow label="Ghi chú" value={text(course, 'additionalNotes')} />
        </Card>
      ) : null}

      <Card>
        <CollapsibleSection title="Dấu vết ghi nhận">
          <InfoRow label="Tạo bởi" value={text(course, 'createdByName')} />
          <InfoRow label="Tạo lúc" value={formatDate(text(course, 'createdAt'))} />
          <InfoRow label="Sửa bởi" value={text(course, 'updatedByName')} />
          <InfoRow label="Kết thúc bởi" value={text(course, 'finishedByName')} />
        </CollapsibleSection>
      </Card>

      {canFinish ? (
        <Button label="Kết thúc khóa" variant="destructive" onPress={() => setPending('finish')} />
      ) : null}
      {canToggle && def.toggle ? (
        <Button
          label={def.toggle.label(course)}
          variant={active ? 'destructive' : 'outline'}
          onPress={() => setToggleOpen(true)}
        />
      ) : null}

      <ConfirmSheet
        visible={pending !== null}
        title={pending ? MESSAGES[pending].title : ''}
        message={error ?? (pending ? MESSAGES[pending].message : '')}
        confirmLabel={pending ? MESSAGES[pending].confirm : 'Xác nhận'}
        destructive={pending === 'finish'}
        loading={busy}
        onCancel={() => {
          setPending(null);
          setError(null);
        }}
        onConfirm={() => void confirmPending()}
      />
      <ToggleSheet
        def={def}
        row={course}
        visible={toggleOpen}
        onClose={() => setToggleOpen(false)}
      />
    </Screen>
  );
}
