import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { text } from '@/shared/resource/row';
import type { PermissionSubject } from '@/shared/resource/types';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { useToast } from '@/shared/ui/Toast';

import {
  canApproveRegistrations,
  isOwnPendingSubmission,
  type TrainingSubject,
} from '../domain/training-permissions';

/**
 * Sửa ghi chú đăng ký như web: người duyệt sửa mọi hồ sơ, người gửi sửa hồ sơ của mình khi còn chờ duyệt; khóa đã kết
 * thúc / vô hiệu hóa thì chỉ xem (BE kiểm tra lại).
 */
export function RegistrationNoteEditor({
  row,
  subject,
}: {
  row: ResourceRow;
  subject: PermissionSubject | null;
}) {
  const gateway = useResourceGateway();
  const queryClient = useQueryClient();
  const toast = useToast();
  const original = text(row, 'registrationNote');
  const [draft, setDraft] = useState(original);
  const [saving, setSaving] = useState(false);

  const locked = row.courseFinished === true || row.courseDisabled === true;
  const editable =
    !locked &&
    (canApproveRegistrations(subject) ||
      isOwnPendingSubmission(subject as TrainingSubject | null, row));
  if (!editable) return null;

  const changed = draft.trim() !== original.trim();
  const save = async () => {
    setSaving(true);
    try {
      await gateway.call(
        'PATCH',
        `/training/participations/${encodeURIComponent(text(row, 'id'))}/registration-note`,
        { body: { note: draft.trim() } },
      );
      toast.success('Đã lưu ghi chú');
      await queryClient.invalidateQueries();
    } catch (exception) {
      toast.error(errorMessage(exception));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <View style={{ gap: 12 }}>
        <Text variant="heading" accessibilityRole="header">
          Sửa ghi chú đăng ký
        </Text>
        <TextField
          label="Ghi chú đăng ký"
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={1000}
          placeholder="Thêm ghi chú"
        />
        <Button
          label="Lưu ghi chú"
          disabled={!changed}
          loading={saving}
          onPress={() => void save()}
        />
      </View>
    </Card>
  );
}
