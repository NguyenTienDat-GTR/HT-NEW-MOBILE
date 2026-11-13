import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Text } from './Text';

export interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Hành động không hoàn tác được: nút xác nhận màu danger. */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Hỏi xác nhận bằng sheet dưới màn hình (nút lớn, dễ bấm), thay cho hộp thoại nhỏ giữa màn hình. */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Hủy',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button
            label={confirmLabel}
            variant={destructive ? 'destructive' : 'primary'}
            loading={loading}
            onPress={onConfirm}
          />
          <Button label={cancelLabel} variant="ghost" size="sm" onPress={onCancel} />
        </>
      }
    >
      <Text variant="body" tone="textSecondary">
        {message}
      </Text>
    </BottomSheet>
  );
}
