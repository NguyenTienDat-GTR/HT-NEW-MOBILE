import { useQueryClient } from '@tanstack/react-query';

import { errorMessage } from '@/core/domain/app-error';
import { AvatarPickerSheet } from '@/shared/ui/AvatarPickerSheet';
import { useToast } from '@/shared/ui/Toast';

import { useAccountDependencies } from '../account-context';
import { MY_PROFILE_QUERY_KEY } from '../use-account-queries';

/**
 * Đổi ảnh đại diện của tài khoản không gắn huynh trưởng (như web): chọn, cắt 4x6, tích đồng ý rồi tải lên và đặt làm
 * ảnh đại diện. Ảnh huynh trưởng sửa ở hồ sơ huynh trưởng.
 */
export function AvatarSheet({
  visible,
  currentUri,
  onClose,
}: {
  visible: boolean;
  currentUri: string | null;
  onClose: () => void;
}) {
  const deps = useAccountDependencies();
  const queryClient = useQueryClient();
  const toast = useToast();
  return (
    <AvatarPickerSheet
      visible={visible}
      currentUri={currentUri}
      requireConsent
      onClose={onClose}
      onConfirm={async (file) => {
        try {
          await deps.changeMyAvatar.execute(file);
        } catch (exception) {
          toast.error(errorMessage(exception));
          throw exception;
        }
        await queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY });
        toast.success('Đã cập nhật ảnh đại diện');
      }}
    />
  );
}
