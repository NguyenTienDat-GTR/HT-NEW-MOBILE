import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { text } from '@/shared/resource/row';
import type { PermissionSubject } from '@/shared/resource/types';
import { resourceKey } from '@/shared/resource/use-resource';
import { isCourseEnded } from '../domain/course-state';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmSheet } from '@/shared/ui/ConfirmSheet';
import { InfoRow } from '@/shared/ui/InfoRow';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { useToast } from '@/shared/ui/Toast';

import {
  buildScoreBody,
  canCreateExceptionCertificate,
  hasAnyScore,
  previewTotal,
  scoringBlockedReason,
  validateFilledScores,
  type ScoreComponent,
} from '../domain/score-entry';
import { canScoreParticipants } from '../domain/training-permissions';

import { leaderName, resultText, scoreText, unitOf } from './participation-common';

/**
 * Chấm điểm một hồ sơ: mỗi thành phần điểm của khóa là một ô nhập (điểm tối đa, hệ số hiển thị ngay dưới nhãn), kèm
 * điểm tổng kết tạm tính. Phải nhập đủ mọi thành phần; BE kiểm tra khóa điểm, khóa đã kết thúc và quyền.
 */
export function ScoreEntryScreen({
  id,
  subject,
}: {
  id: string;
  subject: PermissionSubject | null;
}) {
  const gateway = useResourceGateway();
  const queryClient = useQueryClient();
  const participant = useQuery({
    queryKey: [...resourceKey('scores'), 'row', id],
    queryFn: () => gateway.get('/training/participants', id),
  });
  const courseCode = participant.data ? text(participant.data, 'courseCode') : '';
  const components = useQuery({
    queryKey: ['score-components', courseCode],
    queryFn: () =>
      gateway.call<ScoreComponent[]>(
        'GET',
        `/training/courses/${encodeURIComponent(courseCode)}/score-components`,
      ),
    enabled: courseCode !== '',
  });

  const course = useQuery({
    queryKey: ['score-course', courseCode],
    queryFn: () => gateway.get('/training/courses', courseCode),
    enabled: courseCode !== '',
  });

  if (participant.isPending || (courseCode !== '' && (components.isPending || course.isPending)))
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  if (participant.isError || !participant.data)
    return (
      <Screen onRefresh={() => void participant.refetch()}>
        <Banner tone="danger" message={errorMessage(participant.error)} />
      </Screen>
    );
  if (components.isError)
    return (
      <Screen>
        <Banner tone="danger" message={errorMessage(components.error)} />
      </Screen>
    );

  return (
    <ScoreForm
      // Nạp lại biểu mẫu khi dữ liệu hồ sơ đổi (sau khi lưu).
      key={`${id}-${text(participant.data, 'updatedAt')}`}
      row={participant.data}
      course={course.data ?? null}
      components={[...(components.data ?? [])].sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
      )}
      subject={subject}
      onSaved={async () => {
        await queryClient.invalidateQueries({ queryKey: resourceKey('scores') });
        await queryClient.invalidateQueries({ queryKey: resourceKey('participants') });
      }}
    />
  );
}

function ScoreForm({
  row,
  course,
  components,
  subject,
  onSaved,
}: {
  row: ResourceRow;
  course: ResourceRow | null;
  components: ScoreComponent[];
  subject: PermissionSubject | null;
  onSaved: () => Promise<void>;
}) {
  const gateway = useResourceGateway();
  const toast = useToast();
  const saved = Array.isArray(row.componentScores) ? (row.componentScores as ResourceRow[]) : [];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(saved.map((item) => [text(item, 'componentId'), text(item, 'score')])),
  );
  const [review, setReview] = useState(text(row, 'review'));
  const [scoreNote, setScoreNote] = useState(text(row, 'scoreNote'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [message, setMessage] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);

  const total = previewTotal(components, values);
  const allowed = canScoreParticipants(subject);
  // Như web: điểm chỉ nhập được khi khóa đang diễn ra, chưa khóa chỉnh sửa điểm và chứng nhận chưa được duyệt; nhận
  // xét vẫn sửa được cả khi điểm đã khóa, chỉ chặn khi khóa đã kết thúc hoặc bị vô hiệu hóa.
  const blocked = course ? scoringBlockedReason(course, row) : null;
  const scoresEditable = allowed && blocked === null;
  const courseEnded = course ? isCourseEnded(course) || course.finishedAt != null : false;
  const notesEditable = allowed && !courseEnded && course?.status !== false;
  const noteChanged = scoreNote.trim() !== text(row, 'scoreNote').trim();

  const createException = async () => {
    setSaving(true);
    try {
      await gateway.call(
        'POST',
        `/training/participations/${encodeURIComponent(text(row, 'id'))}/exception-certificate`,
        { body: {} },
      );
      toast.success('Đã tạo chứng nhận ngoại lệ, chứng nhận chờ duyệt ở tab Duyệt chứng nhận');
      setExceptionOpen(false);
      await onSaved();
    } catch (exception) {
      toast.error(errorMessage(exception));
      setExceptionOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setMessage(null);
    const id = encodeURIComponent(text(row, 'id'));
    // Chỉ sửa nhận xét (điểm đã khóa hoặc chưa nhập điểm nào): gửi riêng, không động tới điểm.
    const scoring = scoresEditable && hasAnyScore(components, values);
    if (!scoring) {
      if (!noteChanged || !notesEditable) {
        const reason = scoresEditable ? 'Chưa nhập điểm nào.' : 'Không có thay đổi nào để lưu.';
        setMessage({ tone: 'danger', text: reason });
        return;
      }
      setSaving(true);
      try {
        await gateway.call('PATCH', `/training/participations/${id}/score-note`, {
          body: { note: scoreNote.trim() },
        });
        toast.success('Đã lưu nhận xét');
        await onSaved();
      } catch (exception) {
        setMessage({ tone: 'danger', text: errorMessage(exception) });
        toast.error(errorMessage(exception));
      } finally {
        setSaving(false);
      }
      return;
    }
    const found = validateFilledScores(components, values);
    setErrors(found);
    if (Object.keys(found).length > 0)
      return setMessage({ tone: 'danger', text: 'Vui lòng kiểm tra các ô điểm được đánh dấu.' });
    setSaving(true);
    try {
      await gateway.call('PATCH', `/training/participations/${id}/score`, {
        body: buildScoreBody(components, values, review, scoreNote),
      });
      toast.success('Đã lưu điểm');
      await onSaved();
    } catch (exception) {
      setMessage({ tone: 'danger', text: errorMessage(exception) });
      toast.error(errorMessage(exception));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      footer={
        allowed && (scoresEditable || notesEditable) ? (
          <Button
            label={scoresEditable ? 'Lưu điểm' : 'Lưu nhận xét'}
            loading={saving}
            onPress={() => void submit()}
          />
        ) : undefined
      }
    >
      <Card>
        <View style={{ gap: 4 }}>
          <Text variant="title" accessibilityRole="header">
            {leaderName(row)}
          </Text>
          <Text variant="secondary" tone="textSecondary">
            {unitOf(row)}
          </Text>
          <Text variant="secondary" tone="muted">
            {text(row, 'courseName')}
          </Text>
        </View>
      </Card>

      {message ? <Banner tone={message.tone} message={message.text} /> : null}
      {!allowed ? (
        <Banner tone="warning" message="Tài khoản của bạn không có quyền chấm điểm." />
      ) : blocked ? (
        <Banner tone="warning" message={blocked} />
      ) : null}

      <Card>
        <View style={{ gap: 12 }}>
          <Text variant="heading" accessibilityRole="header">
            Điểm thành phần
          </Text>
          {components.map((component) => (
            <TextField
              key={component.id}
              label={`${component.name} (tối đa ${component.maxScore}, hệ số ${component.coefficient}${
                component.includeInFinal ? '' : ', không tính tổng kết'
              })`}
              value={values[component.id] ?? ''}
              onChangeText={(value) => {
                setValues((current) => ({ ...current, [component.id]: value }));
                setErrors((current) => {
                  const { [component.id]: _removed, ...rest } = current;
                  return rest;
                });
              }}
              keyboardType="decimal-pad"
              error={errors[component.id]}
              editable={scoresEditable}
            />
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ gap: 12 }}>
          <InfoRow
            label="Điểm tổng kết tạm tính"
            value={total === null ? 'Chưa đủ điểm' : String(total)}
          />
          <InfoRow label="Điểm đã lưu" value={scoreText(row)} />
          <InfoRow label="Kết quả" value={resultText(row)} />
        </View>
      </Card>

      <TextField
        label="Nhận xét"
        value={scoreNote}
        onChangeText={setScoreNote}
        multiline
        maxLength={1000}
        editable={notesEditable}
      />
      {allowed && canCreateExceptionCertificate(row) ? (
        <Button
          label="Tạo chứng nhận ngoại lệ"
          variant="outline"
          onPress={() => setExceptionOpen(true)}
        />
      ) : null}
      <ConfirmSheet
        visible={exceptionOpen}
        title="Tạo chứng nhận ngoại lệ"
        message={`Tạo chứng nhận ngoại lệ cho ${leaderName(row)}? Hồ sơ không đạt nhưng chứng nhận sẽ chờ người duyệt quyết định (bắt buộc nhập lý do khi duyệt).`}
        confirmLabel="Tạo chứng nhận"
        loading={saving}
        onConfirm={() => void createException()}
        onCancel={() => setExceptionOpen(false)}
      />
      <TextField
        label="Ghi chú của người chấm"
        value={review}
        onChangeText={setReview}
        multiline
        maxLength={1000}
        editable={scoresEditable}
      />
    </Screen>
  );
}
