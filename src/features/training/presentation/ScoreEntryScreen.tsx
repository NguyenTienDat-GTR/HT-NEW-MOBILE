import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { text } from '@/shared/resource/row';
import type { PermissionSubject } from '@/shared/resource/types';
import { resourceKey } from '@/shared/resource/use-resource';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InfoRow } from '@/shared/ui/InfoRow';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import {
  buildScoreBody,
  previewTotal,
  validateScores,
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

  if (participant.isPending || (courseCode !== '' && components.isPending))
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
  components,
  subject,
  onSaved,
}: {
  row: ResourceRow;
  components: ScoreComponent[];
  subject: PermissionSubject | null;
  onSaved: () => Promise<void>;
}) {
  const gateway = useResourceGateway();
  const saved = Array.isArray(row.componentScores) ? (row.componentScores as ResourceRow[]) : [];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(saved.map((item) => [text(item, 'componentId'), text(item, 'score')])),
  );
  const [review, setReview] = useState(text(row, 'review'));
  const [scoreNote, setScoreNote] = useState(text(row, 'scoreNote'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);

  const total = previewTotal(components, values);
  const allowed = canScoreParticipants(subject);

  const submit = async () => {
    setMessage(null);
    const found = validateScores(components, values);
    setErrors(found);
    if (Object.keys(found).length > 0)
      return setMessage({ tone: 'danger', text: 'Vui lòng kiểm tra các ô điểm được đánh dấu.' });
    setSaving(true);
    try {
      await gateway.call(
        'PATCH',
        `/training/participations/${encodeURIComponent(text(row, 'id'))}/score`,
        {
          body: buildScoreBody(components, values, review, scoreNote),
        },
      );
      setMessage({ tone: 'info', text: 'Đã lưu điểm.' });
      await onSaved();
    } catch (exception) {
      setMessage({ tone: 'danger', text: errorMessage(exception) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      footer={
        allowed ? (
          <Button label="Lưu điểm" loading={saving} onPress={() => void submit()} />
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
              editable={allowed}
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
        editable={allowed}
      />
      <TextField
        label="Ghi chú của người chấm"
        value={review}
        onChangeText={setReview}
        multiline
        maxLength={1000}
        editable={allowed}
      />
    </Screen>
  );
}
