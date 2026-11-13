import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { text } from '@/shared/resource/row';
import { resourceKey } from '@/shared/resource/use-resource';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmSheet } from '@/shared/ui/ConfirmSheet';
import { Text } from '@/shared/ui/Text';

/**
 * Thu hồi một quyền đã phân (cho vai trò hoặc tài khoản). Thu hồi là vĩnh viễn: quyền đã thu hồi không bật lại được,
 * chỉ phân quyền mới. `visible` do luật hiện nút của domain quyết định.
 */
export function RevokeGrantAction({
  row,
  visible,
  target,
  resourceId,
}: {
  row: ResourceRow;
  visible: boolean;
  target: { endpoint: string; param: 'roleCode' | 'username'; subject: string };
  resourceId: string;
}) {
  const gateway = useResourceGateway();
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);

  if (!visible && !message) return null;

  const permission = text(row, 'permissionName') || text(row, 'permissionCode');
  const revoke = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await gateway.call('POST', `${target.endpoint}/revoke`, {
        body: {
          [target.param]: text(row, target.param),
          permissionCodes: [text(row, 'permissionCode')],
        },
      });
      setMessage({ tone: 'info', text: 'Đã thu hồi quyền.' });
      await queryClient.invalidateQueries({ queryKey: resourceKey(resourceId) });
    } catch (exception) {
      setMessage({ tone: 'danger', text: errorMessage(exception) });
    } finally {
      setBusy(false);
      setAsking(false);
    }
  };

  return (
    <Card>
      <View style={{ gap: 8 }}>
        <Text variant="heading" accessibilityRole="header">
          Thao tác
        </Text>
        {message ? <Banner tone={message.tone} message={message.text} /> : null}
        {visible ? (
          <Button label="Thu hồi quyền" variant="destructive" onPress={() => setAsking(true)} />
        ) : null}
      </View>
      <ConfirmSheet
        visible={asking}
        title="Thu hồi quyền"
        message={`Quyền "${permission}" của ${target.subject} sẽ bị thu hồi. Thu hồi là vĩnh viễn: muốn có lại quyền này phải phân quyền mới.`}
        confirmLabel="Thu hồi quyền"
        destructive
        loading={busy}
        onConfirm={() => void revoke()}
        onCancel={() => setAsking(false)}
      />
    </Card>
  );
}
