import { useState } from 'react';

import { errorMessage } from '@/core/domain/app-error';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { text } from '@/shared/resource/row';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import { holderName } from './certificate-view';

export type ReasonMode = 'revoke' | 'reissue';

const COPY: Record<
  ReasonMode,
  { title: string; confirm: string; label: string; effects: string[] }
> = {
  revoke: {
    title: 'Thu hồi chứng nhận',
    confirm: 'Thu hồi chứng nhận',
    label: 'Lý do thu hồi (bắt buộc)',
    effects: [
      'Hồ sơ của khóa huấn luyện liên kết chuyển thành Không đạt, dù điểm cao hơn điểm đạt.',
      'Huynh trưởng được hạ về cấp trước đó đã đạt (nếu khóa này đã thăng cấp cho họ).',
      'Nếu huynh trưởng còn chứng nhận cấp cao hơn, phải thu hồi chứng nhận cấp cao nhất trước.',
      'Không thể xuất PDF, duyệt lại hay sửa điểm; người có quyền cấp lại mới mở lại được.',
    ],
  },
  reissue: {
    title: 'Cấp lại chứng nhận',
    confirm: 'Cấp lại chứng nhận',
    label: 'Lý do cấp lại (bắt buộc)',
    effects: [
      'Chứng nhận trở lại Đã duyệt (giữ nguyên người ký cũ), hồ sơ của khóa trở lại đạt.',
      'Nếu khóa đã kết thúc, huynh trưởng được thăng cấp lại theo chứng nhận.',
      'Phải cấp lại từ chứng nhận cấp thấp nhất đang bị thu hồi của huynh trưởng trước.',
    ],
  },
};

/** Thu hồi hoặc cấp lại một chứng nhận: cho xem hệ quả rồi bắt buộc nhập lý do. */
export function CertificateReasonSheet({
  mode,
  row,
  onClose,
  onDone,
}: {
  mode: ReasonMode | null;
  row: ResourceRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const gateway = useResourceGateway();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seen, setSeen] = useState<ReasonMode | null>(null);
  if (mode !== seen) {
    setSeen(mode);
    setReason('');
    setError(null);
  }
  if (!mode) return null;

  const copy = COPY[mode];
  const code = text(row, 'certificateCode');
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await gateway.call('POST', `/certificates/${encodeURIComponent(code)}/${mode}`, {
        body: { reason: reason.trim() },
      });
      onDone();
    } catch (exception) {
      setError(errorMessage(exception));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible
      title={copy.title}
      onClose={onClose}
      footer={
        <>
          <Button
            label={copy.confirm}
            variant={mode === 'revoke' ? 'destructive' : 'primary'}
            loading={busy}
            disabled={reason.trim() === ''}
            onPress={() => void submit()}
          />
          <Button label="Hủy" variant="ghost" size="sm" onPress={onClose} />
        </>
      }
    >
      <Text variant="body" tone="textSecondary">
        {`Chứng nhận ${code}${holderName(row) ? ` của ${holderName(row)}` : ''}${
          text(row, 'courseName') ? ` (khóa ${text(row, 'courseName')})` : ''
        } sẽ ${mode === 'revoke' ? 'bị thu hồi' : 'được cấp lại'}.`}
      </Text>
      {copy.effects.map((line) => (
        <Text key={line} variant="secondary" tone="muted">
          {`• ${line}`}
        </Text>
      ))}
      <TextField
        label={copy.label}
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={1000}
      />
      {error ? <Banner tone="danger" message={error} /> : null}
    </BottomSheet>
  );
}
