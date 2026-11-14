import { useState } from 'react';

import { errorMessage } from '@/core/domain/app-error';
import type { PermissionSubject } from '@/core/domain/permissions';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { loadOptions } from '@/shared/resource/options';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { text } from '@/shared/resource/row';
import { useInvalidateResource } from '@/shared/resource/use-resource';
import type { ResourceDefinition } from '@/shared/resource/types';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmSheet } from '@/shared/ui/ConfirmSheet';
import { SelectField, type SelectOption } from '@/shared/ui/SelectField';
import { Text } from '@/shared/ui/Text';
import { useToast } from '@/shared/ui/Toast';
import { useQuery } from '@tanstack/react-query';

import { canChangeParishParent } from '../domain/organization-permissions';

/**
 * Thao tác riêng của giáo họ / giáo điểm: đổi giáo xứ cha, nâng lên giáo xứ độc lập.
 * Chỉ hiện với đơn vị không phải giáo xứ và người có quyền tạo giáo xứ (như web).
 */
export function ParishActions({
  def,
  row,
  subject,
}: {
  def: ResourceDefinition;
  row: ResourceRow;
  subject: PermissionSubject | null;
}) {
  const gateway = useResourceGateway();
  const invalidate = useInvalidateResource(def);
  const toast = useToast();
  const [parentOpen, setParentOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [parentId, setParentId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const id = text(row, 'id');
  const deaneryId = text(row, 'deaneryId');
  const options = useQuery<SelectOption[]>({
    queryKey: ['parish-parent-options', deaneryId],
    queryFn: () =>
      loadOptions(
        gateway,
        '/parishes',
        { value: 'id', label: 'name' },
        { filters: { 'deanery.id': deaneryId, unitType: 'PARISH' } },
      ),
    enabled: parentOpen && deaneryId !== '',
  });

  if (text(row, 'unitType') === 'PARISH' || !canChangeParishParent(subject)) return null;

  const run = async (action: () => Promise<unknown>, success: string, close: () => void) => {
    setPending(true);
    setError(null);
    try {
      await action();
      await invalidate();
      toast.success(success);
      close();
    } catch (exception) {
      setError(errorMessage(exception));
      toast.error(errorMessage(exception));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card style={{ gap: 12 }}>
      <Text variant="heading" accessibilityRole="header">
        Giáo xứ cha
      </Text>
      <Text variant="body" tone="textSecondary">
        {text(row, 'parentParishName') || 'Chưa có giáo xứ cha'}
      </Text>
      <Button
        label="Đổi giáo xứ cha"
        variant="outline"
        onPress={() => {
          setParentId('');
          setError(null);
          setParentOpen(true);
        }}
      />
      <Button
        label="Nâng lên giáo xứ"
        variant="outline"
        onPress={() => {
          setError(null);
          setPromoteOpen(true);
        }}
      />

      <BottomSheet
        visible={parentOpen}
        title="Đổi giáo xứ cha"
        onClose={() => setParentOpen(false)}
        footer={
          <>
            <Button
              label="Lưu"
              loading={pending}
              disabled={parentId === '' || parentId === text(row, 'parentParishId')}
              onPress={() =>
                void run(
                  () =>
                    gateway.call('PATCH', `/parishes/${encodeURIComponent(id)}/parent`, {
                      body: { parentParishId: parentId },
                    }),
                  'Đã đổi giáo xứ cha',
                  () => setParentOpen(false),
                )
              }
            />
            <Button label="Hủy" variant="ghost" size="sm" onPress={() => setParentOpen(false)} />
          </>
        }
      >
        <SelectField
          label="Giáo xứ cha (cùng giáo hạt)"
          value={parentId}
          options={options.data ?? []}
          placeholder={options.isPending ? 'Đang tải…' : 'Chọn giáo xứ'}
          allowClear={false}
          onChange={setParentId}
        />
        {error ? <Banner tone="danger" message={error} /> : null}
      </BottomSheet>

      <ConfirmSheet
        visible={promoteOpen}
        title="Nâng lên giáo xứ"
        message="Đơn vị trở thành giáo xứ độc lập, không còn thuộc giáo xứ cha. Huynh trưởng và tài khoản giữ nguyên."
        confirmLabel="Nâng lên giáo xứ"
        loading={pending}
        onCancel={() => setPromoteOpen(false)}
        onConfirm={() =>
          void run(
            () => gateway.call('PATCH', `/parishes/${encodeURIComponent(id)}/promote`),
            'Đã chuyển thành giáo xứ',
            () => setPromoteOpen(false),
          )
        }
      />
      {error && !parentOpen ? <Banner tone="danger" message={error} /> : null}
    </Card>
  );
}
