import { useState } from 'react';

import { errorMessage } from '@/core/domain/app-error';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { text } from '@/shared/resource/row';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { DateField } from '@/shared/ui/DateField';
import { SelectField } from '@/shared/ui/SelectField';
import { Text } from '@/shared/ui/Text';
import { FilterChips } from '@/shared/ui/FilterChips';
import { TextField } from '@/shared/ui/TextField';

import {
  buildApproveBody,
  buildBulkApproveBody,
  buildBulkRejectBody,
  missingReasonCount,
  buildRejectBody,
  decisionNeeds,
  DEFAULT_SIGNER,
  SIGNER_OPTIONS,
  todayIso,
  validateApprove,
  validateReject,
  type SignerDraft,
  type SignerType,
} from '../domain/certificate-approval';

export interface DecisionResult {
  successCount: number;
  failedCount: number;
  failures: { id: string; leaderFullName: string; reason: string }[];
}

const encode = encodeURIComponent;
const REASON_SCOPES = [
  { value: 'shared', label: 'Lý do chung' },
  { value: 'individual', label: 'Lý do riêng từng hồ sơ' },
] as const;
const SINGLE_OK: DecisionResult = { successCount: 1, failedCount: 0, failures: [] };

/**
 * Duyệt hoặc từ chối một hay nhiều chứng nhận (cùng một sheet, như hộp thoại duyệt của web).
 * Duyệt: chọn người ký; khóa quá khứ chọn ngày duyệt; chứng nhận ngoại lệ bắt buộc lý do. Từ chối: bắt buộc lý do.
 */
export function CertificateDecisionSheet({
  action,
  rows,
  onClose,
  onDone,
}: {
  action: 'approve' | 'reject' | null;
  rows: readonly ResourceRow[];
  onClose: () => void;
  onDone: (result: DecisionResult) => void;
}) {
  const gateway = useResourceGateway();
  const [note, setNote] = useState('');
  const [signer, setSigner] = useState<SignerDraft>(DEFAULT_SIGNER);
  const [approvalDate, setApprovalDate] = useState('');
  const [scope, setScope] = useState<'shared' | 'individual'>('shared');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seen, setSeen] = useState<typeof action>(null);
  if (action !== seen) {
    setSeen(action);
    setNote('');
    setSigner(DEFAULT_SIGNER);
    setApprovalDate('');
    setScope('shared');
    setReasons({});
    setError(null);
  }

  const rejecting = action === 'reject';
  const needs = decisionNeeds(rows);
  const input = { signer, note, approvalDate, needs };
  const ids = rows.map((row) => text(row, 'certificateCode'));
  const many = rows.length > 1;
  // Từ chối nhiều chứng nhận: lý do chung hoặc lý do riêng từng hồ sơ (như web).
  const individual = rejecting && many && scope === 'individual';
  const missing = individual ? missingReasonCount(ids, reasons) : 0;
  const problem = rejecting
    ? individual
      ? missing > 0
        ? `Còn ${missing} hồ sơ chưa nhập lý do.`
        : null
      : validateReject(note)
    : validateApprove(input);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (many) {
        const body = rejecting
          ? buildBulkRejectBody(ids, note, individual ? reasons : undefined)
          : buildBulkApproveBody(ids, input);
        const result = await gateway.call<DecisionResult>('POST', '/certificates/bulk-approval', {
          body,
        });
        onDone(result);
      } else {
        const code = ids[0] ?? '';
        await gateway.call(
          'POST',
          `/certificates/${encode(code)}/${rejecting ? 'reject' : 'approve'}`,
          {
            body: rejecting ? buildRejectBody(note) : buildApproveBody(input),
          },
        );
        onDone(SINGLE_OK);
      }
    } catch (exception) {
      setError(errorMessage(exception));
    } finally {
      setBusy(false);
    }
  };

  const title = rejecting
    ? many
      ? `Từ chối ${rows.length} chứng nhận`
      : 'Từ chối chứng nhận'
    : many
      ? `Duyệt ${rows.length} chứng nhận`
      : 'Duyệt chứng nhận';

  return (
    <BottomSheet
      visible={action !== null}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button
            label={rejecting ? 'Từ chối' : 'Duyệt'}
            variant={rejecting ? 'destructive' : 'primary'}
            loading={busy}
            disabled={problem !== null}
            onPress={() => void submit()}
          />
          <Button label="Hủy" variant="ghost" size="sm" onPress={onClose} />
        </>
      }
    >
      {!rejecting ? (
        <>
          <SelectField
            label="Người ký chứng nhận"
            value={signer.type}
            options={SIGNER_OPTIONS.map((option) => ({ ...option }))}
            allowClear={false}
            onChange={(value) => setSigner({ ...signer, type: value as SignerType })}
          />
          {signer.type === 'COURSE_CHAPLAIN' ? (
            <Text variant="secondary" tone="muted">
              Hệ thống tự ghi cha tuyên úy của đơn vị tổ chức khóa (giáo hạt hoặc giáo phận). Nếu
              đơn vị chưa có thông tin cha tuyên úy, hãy cập nhật đơn vị hoặc chọn cách nhập tên.
            </Text>
          ) : (
            <TextField
              label="Tên người ký"
              value={signer.name}
              onChangeText={(value) => setSigner({ ...signer, name: value })}
              autoCapitalize="words"
              maxLength={150}
            />
          )}
          {signer.type === 'OTHER' ? (
            <TextField
              label="Chức danh người ký"
              value={signer.title}
              onChangeText={(value) => setSigner({ ...signer, title: value })}
              maxLength={150}
            />
          ) : null}
          {needs.approvalDate ? (
            <DateField
              label="Ngày duyệt"
              hint="Khóa quá khứ: ngày này được dùng làm ngày cấp chứng nhận."
              value={approvalDate}
              onChange={setApprovalDate}
              maximumDate={todayIso()}
            />
          ) : null}
        </>
      ) : null}
      {rejecting && many ? (
        <FilterChips options={REASON_SCOPES} value={scope} onChange={(value) => setScope(value)} />
      ) : null}
      {individual ? (
        rows.map((row, index) => {
          const code = text(row, 'certificateCode');
          return (
            <TextField
              key={code}
              label={`${index + 1}. ${text(row, 'leaderFullName') || code}`}
              value={reasons[code] ?? ''}
              onChangeText={(value) => setReasons((current) => ({ ...current, [code]: value }))}
              placeholder="Lý do từ chối hồ sơ này (bắt buộc)"
              multiline
              maxLength={1000}
            />
          );
        })
      ) : (
        <TextField
          label={
            rejecting
              ? many
                ? 'Lý do từ chối (áp dụng cho tất cả, bắt buộc)'
                : 'Lý do từ chối (bắt buộc)'
              : needs.approveReason
                ? 'Lý do duyệt ngoại lệ (bắt buộc)'
                : 'Ghi chú duyệt (không bắt buộc)'
          }
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={1000}
        />
      )}
      {problem && (rejecting ? note.length > 0 || individual : true) ? (
        <Text variant="secondary" tone="muted">
          {problem}
        </Text>
      ) : null}
      {error ? <Banner tone="danger" message={error} /> : null}
    </BottomSheet>
  );
}
