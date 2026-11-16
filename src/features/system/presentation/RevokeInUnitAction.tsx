import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { loadOptions } from '@/shared/resource/options';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { text } from '@/shared/resource/row';
import { resourceKey } from '@/shared/resource/use-resource';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { SelectField } from '@/shared/ui/SelectField';
import { Text } from '@/shared/ui/Text';
import { useToast } from '@/shared/ui/Toast';

import {
  compactUnitIds,
  isFinalGrant,
  unitActorOf,
  unitPermissionAllowed,
  unitScopeEnabled,
  type UnitIds,
} from '../domain/permission-grants';
import type { SystemSubject } from '../domain/system-permissions';

/**
 * Thu hồi một quyền mặc định của vai trò chỉ tại một đơn vị (giáo phận, giáo hạt hoặc giáo xứ), không ảnh hưởng nơi khác.
 * Chỉ hiện trên dòng mặc định còn hiệu lực, với người được chỉnh quyền riêng theo đơn vị của vai trò đó.
 */
export function RevokeInUnitAction({
  row,
  subject,
}: {
  row: ResourceRow;
  subject: SystemSubject | null;
}) {
  const actor = unitActorOf(subject);
  const roleCode = text(row, 'roleCode');
  const permissionCode = text(row, 'permissionCode');
  const eligible =
    row.entryType === 'DEFAULT' &&
    !isFinalGrant(row) &&
    unitScopeEnabled(actor, roleCode) &&
    unitPermissionAllowed(actor, permissionCode);
  if (!eligible) return null;
  return <UnitRevokeCard row={row} actor={actor} roleCode={roleCode} permissionCode={permissionCode} />;
}

function UnitRevokeCard({
  row,
  actor,
  roleCode,
  permissionCode,
}: {
  row: ResourceRow;
  actor: ReturnType<typeof unitActorOf>;
  roleCode: string;
  permissionCode: string;
}) {
  const gateway = useResourceGateway();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);
  const [dioceseId, setDioceseId] = useState('');
  const [deaneryId, setDeaneryId] = useState('');
  const [parishId, setParishId] = useState('');

  const dioceses = useQuery({
    queryKey: ['unit-revoke', 'dioceses'],
    enabled: open && actor === 'super',
    queryFn: () => loadOptions(gateway, '/dioceses', { value: 'id', label: 'name' }),
  });
  const deaneries = useQuery({
    queryKey: ['unit-revoke', 'deaneries'],
    enabled: open && actor === 'diocese',
    queryFn: () => loadOptions(gateway, '/deaneries', { value: 'id', label: 'name' }),
  });
  const showParish =
    roleCode === 'ADMIN_PARISH' &&
    (actor === 'deanery' || (actor === 'diocese' && deaneryId !== ''));
  const parishes = useQuery({
    queryKey: ['unit-revoke', 'parishes', deaneryId],
    enabled: open && showParish,
    queryFn: () =>
      loadOptions(
        gateway,
        '/parishes',
        { value: 'id', label: 'name' },
        { filters: deaneryId ? { 'deanery.id': deaneryId } : {} },
      ),
  });

  // Superadmin bắt buộc chọn giáo phận (nếu không sẽ thành thu hồi mặc định chung ở màn khác).
  const canSubmit = actor !== 'super' || dioceseId !== '';
  const permission = text(row, 'permissionName') || permissionCode;
  const where =
    parishId !== ''
      ? 'giáo xứ đã chọn'
      : deaneryId !== ''
        ? 'giáo hạt đã chọn'
        : actor === 'super'
          ? 'giáo phận đã chọn'
          : actor === 'diocese'
            ? 'cả giáo phận của bạn'
            : 'cả giáo hạt của bạn';

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    const units: UnitIds = compactUnitIds({
      dioceseId: actor === 'super' ? dioceseId : '',
      deaneryId: actor === 'diocese' ? deaneryId : '',
      parishId,
    });
    try {
      await gateway.call('POST', '/system/role-permissions/revoke', {
        body: { roleCode, permissionCodes: [permissionCode], ...units },
      });
      toast.success('Đã thu hồi quyền tại nơi đã chọn');
      setMessage({ tone: 'info', text: 'Đã thu hồi quyền tại nơi đã chọn.' });
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: resourceKey('role-permissions') });
    } catch (exception) {
      toast.error(errorMessage(exception));
      setMessage({ tone: 'danger', text: errorMessage(exception) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={{ gap: 8 }}>
        <Text variant="heading" accessibilityRole="header">
          Thu hồi theo nơi áp dụng
        </Text>
        <Text variant="secondary" tone="muted">
          Chỉ thu hồi quyền này của vai trò tại một nơi, các nơi khác giữ nguyên.
        </Text>
        {message ? <Banner tone={message.tone} message={message.text} /> : null}
        <Button label="Thu hồi tại một đơn vị…" variant="outline" onPress={() => setOpen(true)} />
      </View>
      <BottomSheet
        visible={open}
        title="Thu hồi tại một đơn vị"
        onClose={() => setOpen(false)}
        footer={
          <Button
            label="Thu hồi quyền"
            variant="destructive"
            loading={busy}
            disabled={!canSubmit}
            onPress={() => void submit()}
          />
        }
      >
        <Text variant="secondary">{`Quyền "${permission}" của vai trò sẽ bị thu hồi tại ${where}. Để lấy lại, phân quyền lại ở đúng nơi đó.`}</Text>
        {actor === 'super' ? (
          <SelectField
            label="Giáo phận"
            value={dioceseId}
            options={dioceses.data ?? []}
            allowClear={false}
            placeholder={dioceses.isPending ? 'Đang tải…' : 'Chọn giáo phận'}
            onChange={setDioceseId}
            required
          />
        ) : null}
        {actor === 'diocese' ? (
          <SelectField
            label="Giáo hạt"
            value={deaneryId}
            options={deaneries.data ?? []}
            placeholder="Cả giáo phận của bạn"
            onChange={(next) => {
              setDeaneryId(next);
              setParishId('');
            }}
          />
        ) : null}
        {showParish ? (
          <SelectField
            label="Giáo xứ"
            value={parishId}
            options={parishes.data ?? []}
            placeholder={actor === 'deanery' ? 'Cả giáo hạt của bạn' : 'Cả giáo hạt đã chọn'}
            onChange={setParishId}
          />
        ) : null}
      </BottomSheet>
    </Card>
  );
}
