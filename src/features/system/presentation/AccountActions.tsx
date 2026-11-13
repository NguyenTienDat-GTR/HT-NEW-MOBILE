import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { formatDateTime } from '@/core/domain/date-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { text } from '@/shared/resource/row';
import type { PermissionSubject } from '@/shared/resource/types';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmSheet } from '@/shared/ui/ConfirmSheet';
import { Text } from '@/shared/ui/Text';

import { canResetPasswordRow, type SystemSubject } from '../domain/system-permissions';

interface ResetResult {
  maskedEmail?: string;
  expiresAt?: string;
}

/**
 * Đặt lại mật khẩu tạm cho tài khoản: mật khẩu tạm chỉ gửi qua email, API chỉ trả về email đã che và hạn dùng.
 */
export function AccountActions({
  row,
  subject,
}: {
  row: ResourceRow;
  subject: PermissionSubject | null;
}) {
  const gateway = useResourceGateway();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);
  const username = text(row, 'username');

  if (!canResetPasswordRow(subject as SystemSubject | null, row) && !message) return null;

  const reset = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await gateway.call<ResetResult>(
        'POST',
        `/system/accounts/${encodeURIComponent(username)}/reset-password`,
      );
      const expires = result.expiresAt
        ? ` Mật khẩu tạm dùng được đến ${formatDateTime(result.expiresAt)}.`
        : '';
      setMessage({
        tone: 'info',
        text: `Đã gửi mật khẩu tạm tới ${result.maskedEmail ?? 'email của tài khoản'}.${expires}`,
      });
      setAsking(false);
    } catch (exception) {
      setMessage({ tone: 'danger', text: errorMessage(exception) });
      setAsking(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={{ gap: 8 }}>
        <Text variant="heading" accessibilityRole="header">
          Thao tác
        </Text>
        {message ? <Banner tone={message.tone} message={message.text} /> : null}
        {canResetPasswordRow(subject as SystemSubject | null, row) ? (
          <Button label="Đặt lại mật khẩu" variant="outline" onPress={() => setAsking(true)} />
        ) : null}
      </View>
      <ConfirmSheet
        visible={asking}
        title="Đặt lại mật khẩu"
        message={`Hệ thống gửi mật khẩu tạm tới email của tài khoản ${username}. Mật khẩu tạm chỉ gửi qua email, không hiện trên màn hình.`}
        confirmLabel="Đặt lại mật khẩu"
        destructive
        loading={busy}
        onConfirm={() => void reset()}
        onCancel={() => setAsking(false)}
      />
    </Card>
  );
}
