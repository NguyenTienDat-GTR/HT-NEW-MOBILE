import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';

import { Badge } from '../ui/Badge';
import { Banner } from '../ui/Banner';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { InfoGrid } from '../ui/InfoGrid';
import { InfoRow } from '../ui/InfoRow';
import { LoadingState } from '../ui/LoadingState';
import { Screen } from '../ui/Screen';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';

import { useResourceGateway } from './resource-context';
import type { PermissionSubject, ResourceDefinition } from './types';
import { useInvalidateResource, useResourceRow } from './use-resource';
import type { ResourceRow } from '@/core/resource/resource-gateway';

const CONFIRM_WORD = 'Xác nhận';
const MAX_REASON_LENGTH = 500;

export interface ResourceDetailScreenProps {
  def: ResourceDefinition;
  id: string;
  subject: PermissionSubject | null;
  onEdit: () => void;
}

/** Chi tiết một bản ghi theo cấu hình: đầu trang là tên + nhãn, các nhóm thông tin, hành động theo quyền. */
export function ResourceDetailScreen({ def, id, subject, onEdit }: ResourceDetailScreenProps) {
  const gateway = useResourceGateway();
  const query = useResourceRow(def, id);
  const detailContext = def.detailContext;
  const context = useQuery({
    queryKey: detailContext ? [...detailContext.key] : ['detail-context', 'none'],
    queryFn: () => (detailContext as NonNullable<typeof detailContext>).load(gateway),
    enabled: Boolean(detailContext),
    staleTime: 10 * 60_000,
  });
  const [toggleOpen, setToggleOpen] = useState(false);
  const row = query.data;

  if (query.isPending) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (query.isError || !row) {
    return (
      <Screen onRefresh={() => void query.refetch()}>
        <Banner tone="danger" message={errorMessage(query.error)} />
        <Button label="Thử lại" variant="outline" onPress={() => void query.refetch()} />
      </Screen>
    );
  }

  const canEdit = Boolean(def.form) && def.canUpdate(subject, row);
  const canToggle = Boolean(def.toggle) && def.canToggle(subject, row);
  const sections = def.detail(row, context.data);

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Card>
        <View style={{ gap: 8 }}>
          <Text variant="title" accessibilityRole="header">
            {def.detailTitle(row)}
          </Text>
          {def.detailBadges ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {def.detailBadges(row).map((badge) => (
                <Badge key={badge.label} label={badge.label} tone={badge.tone} />
              ))}
            </View>
          ) : null}
          {canEdit ? (
            <Button
              label={`Sửa ${def.singular.toLowerCase()}`}
              variant="outline"
              size="sm"
              fullWidth={false}
              onPress={onEdit}
            />
          ) : null}
        </View>
      </Card>

      {sections.map((section, index) => (
        <Card key={section.title ?? index}>
          {section.collapsed && section.title ? (
            <CollapsibleSection title={section.title}>
              <InfoGrid>
                {section.fields.map((field) => (
                  <InfoRow key={field.label} label={field.label} value={field.value} />
                ))}
              </InfoGrid>
            </CollapsibleSection>
          ) : (
            <View style={{ gap: 12 }}>
              {section.title ? (
                <Text variant="heading" accessibilityRole="header">
                  {section.title}
                </Text>
              ) : null}
              <InfoGrid>
                {section.fields.map((field) => (
                  <InfoRow key={field.label} label={field.label} value={field.value} />
                ))}
              </InfoGrid>
            </View>
          )}
        </Card>
      ))}

      {def.renderDetailExtra?.({ row, subject })}

      {canToggle && def.toggle ? (
        <Button
          label={def.toggle.label(row)}
          variant={def.toggle.isActive(row) ? 'destructive' : 'outline'}
          onPress={() => setToggleOpen(true)}
        />
      ) : null}

      {def.toggle ? (
        <ToggleSheet
          def={def}
          row={row}
          visible={toggleOpen}
          onClose={() => setToggleOpen(false)}
        />
      ) : null}
    </Screen>
  );
}

/** Sheet xác nhận bật/tắt (lý do, gõ "Xác nhận", xem tác động) dùng chung cho màn chi tiết chung và màn riêng. */
export function ToggleSheet({
  def,
  row,
  visible,
  onClose,
}: {
  def: ResourceDefinition;
  row: ResourceRow;
  visible: boolean;
  onClose: () => void;
}) {
  const toggle = def.toggle;
  const gateway = useResourceGateway();
  const invalidate = useInvalidateResource(def);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const impact = useQuery({
    queryKey: [
      'resource-impact',
      def.id,
      def.idField ?? 'id',
      String(row[def.idField ?? 'id'] ?? ''),
    ],
    queryFn: () => (toggle?.impact ? toggle.impact(gateway, row) : Promise.resolve([])),
    enabled: visible && Boolean(toggle?.impact),
    gcTime: 0,
  });
  if (!toggle) return null;

  const needsReason = toggle.requiresReason?.(row) ?? false;
  const needsConfirmText = toggle.requiresConfirmText?.(row) ?? false;
  const reasonOk =
    !needsReason || (reason.trim().length > 0 && reason.trim().length <= MAX_REASON_LENGTH);
  const confirmOk = !needsConfirmText || confirmText.trim() === CONFIRM_WORD;
  const ready = !(impact.isPending && Boolean(toggle.impact)) && reasonOk && confirmOk;

  const confirm = async () => {
    setPending(true);
    setError(null);
    try {
      await toggle.run(gateway, row, { reason: reason.trim(), confirmText: CONFIRM_WORD });
      await invalidate();
      setReason('');
      setConfirmText('');
      onClose();
    } catch (exception) {
      setError(errorMessage(exception));
    } finally {
      setPending(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={toggle.label(row)}
      onClose={onClose}
      footer={
        <>
          <Button
            label="Xác nhận"
            variant={toggle.isActive(row) ? 'destructive' : 'primary'}
            loading={pending}
            disabled={!ready}
            onPress={() => void confirm()}
          />
          <Button label="Hủy" variant="ghost" size="sm" onPress={onClose} />
        </>
      }
    >
      <Text variant="body" tone="textSecondary">
        {toggle.confirmMessage(row)}
      </Text>
      {toggle.impact ? (
        impact.isPending ? (
          <LoadingState label="Đang kiểm tra tác động…" />
        ) : impact.isError ? (
          <Banner tone="warning" message="Không kiểm tra được tác động. Bạn vẫn có thể xác nhận." />
        ) : (
          (impact.data ?? []).map((line) => (
            <InfoRow key={line.label} label={line.label} value={line.value} />
          ))
        )
      ) : null}
      {needsReason ? (
        <TextField
          label="Lý do (bắt buộc)"
          value={reason}
          onChangeText={setReason}
          multiline
          maxLength={MAX_REASON_LENGTH}
          hint={`Tối đa ${MAX_REASON_LENGTH} ký tự`}
        />
      ) : null}
      {needsConfirmText ? (
        <TextField
          label={`Gõ "${CONFIRM_WORD}" để tiếp tục`}
          value={confirmText}
          onChangeText={setConfirmText}
          placeholder={CONFIRM_WORD}
        />
      ) : null}
      {error ? <Banner tone="danger" message={error} /> : null}
    </BottomSheet>
  );
}
