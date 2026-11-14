import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { shareDownloadedFile, safeFileName } from '@/shared/files/share-file';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { text } from '@/shared/resource/row';
import type { PermissionSubject } from '@/shared/resource/types';
import { resourceKey } from '@/shared/resource/use-resource';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Text } from '@/shared/ui/Text';
import { useToast } from '@/shared/ui/Toast';

import {
  canApproveRow,
  canReissueRow,
  canRejectRow,
  canRevokeRow,
  canSharePdf,
} from '../domain/certificate-permissions';

import { CertificateDecisionSheet } from './CertificateDecisionSheet';
import { CertificateReasonSheet, type ReasonMode } from './CertificateReasonSheet';

/** Làm mới mọi danh sách và chi tiết chứng nhận sau một thao tác. */
export function useRefreshCertificates() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: resourceKey('certificates') });
    await queryClient.invalidateQueries({ queryKey: resourceKey('certificate-approvals') });
    await queryClient.invalidateQueries({ queryKey: ['leader-certificates'] });
  };
}

/**
 * Các thao tác trên một chứng nhận ở màn chi tiết, hiện theo quyền và trạng thái (như web): duyệt, từ chối, thu hồi,
 * cấp lại và chia sẻ PDF.
 */
export function CertificateActions({
  row,
  subject,
}: {
  row: ResourceRow;
  subject: PermissionSubject | null;
}) {
  const gateway = useResourceGateway();
  const refresh = useRefreshCertificates();
  const toast = useToast();
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState<ReasonMode | null>(null);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);

  const code = text(row, 'certificateCode');
  const canApprove = canApproveRow(subject, row);
  const canReject = canRejectRow(subject, row);
  const canRevoke = canRevokeRow(subject, row);
  const canReissue = canReissueRow(subject, row);
  const canPdf = canSharePdf(subject, row);
  const status = row.approvalStatus;
  const lockedByCourse =
    (status === 'PENDING' || status === 'SUBMITTED') &&
    row.courseFinished === true &&
    row.coursePast !== true;

  const sharePdf = async () => {
    setSharing(true);
    setMessage(null);
    try {
      const file = await gateway.download('POST', '/certificates/export-pdf', {
        body: { certificateCodes: [code] },
      });
      const shared = await shareDownloadedFile(file, safeFileName(code), `Chứng nhận ${code}`);
      if (!shared) toast.error('Thiết bị này không hỗ trợ chia sẻ tệp.');
    } catch (exception) {
      toast.error(errorMessage(exception));
      setMessage({ tone: 'danger', text: errorMessage(exception) });
    } finally {
      setSharing(false);
    }
  };

  const done = async (notice: string) => {
    setDecision(null);
    setReason(null);
    toast.success(notice.replace(/\.$/, ''));
    await refresh();
  };

  if (
    !canApprove &&
    !canReject &&
    !canRevoke &&
    !canReissue &&
    !canPdf &&
    !lockedByCourse &&
    !message
  )
    return null;

  return (
    <Card>
      <View style={{ gap: 8 }}>
        <Text variant="heading" accessibilityRole="header">
          Thao tác
        </Text>
        {lockedByCourse ? (
          <Text variant="secondary" tone="muted">
            Khóa đã kết thúc nên không duyệt hay từ chối chứng nhận này được nữa.
          </Text>
        ) : null}
        {message ? <Banner tone={message.tone} message={message.text} /> : null}
        {canApprove ? (
          <Button label="Duyệt chứng nhận" onPress={() => setDecision('approve')} />
        ) : null}
        {canReject ? (
          <Button label="Từ chối" variant="destructive" onPress={() => setDecision('reject')} />
        ) : null}
        {canPdf ? (
          <Button
            label="Chia sẻ PDF"
            variant="outline"
            loading={sharing}
            onPress={() => void sharePdf()}
          />
        ) : null}
        {canReissue ? (
          <Button label="Cấp lại chứng nhận" onPress={() => setReason('reissue')} />
        ) : null}
        {canRevoke ? (
          <Button
            label="Thu hồi chứng nhận"
            variant="destructive"
            onPress={() => setReason('revoke')}
          />
        ) : null}
      </View>

      <CertificateDecisionSheet
        action={decision}
        rows={[row]}
        onClose={() => setDecision(null)}
        onDone={() =>
          void done(decision === 'reject' ? 'Đã từ chối chứng nhận.' : 'Đã duyệt chứng nhận.')
        }
      />
      <CertificateReasonSheet
        mode={reason}
        row={row}
        onClose={() => setReason(null)}
        onDone={() =>
          void done(reason === 'revoke' ? 'Đã thu hồi chứng nhận.' : 'Đã cấp lại chứng nhận.')
        }
      />
    </Card>
  );
}
