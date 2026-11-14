import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { useTheme } from '@/shared/theme/theme-provider';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { ConsentCheckbox } from '@/shared/ui/ConsentCheckbox';
import { Text } from '@/shared/ui/Text';
import { useToast } from '@/shared/ui/Toast';

import { useAccountDependencies } from '../account-context';
import { MY_PROFILE_QUERY_KEY } from '../use-account-queries';

/** Khổ ảnh đại diện 4x6 (dọc), cao tối đa 720px như web (ảnh có thể in lên chứng nhận / thẻ). */
const ASPECT = 2 / 3;
const MAX_HEIGHT = 720;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

interface Picked {
  uri: string;
  name: string;
  type: string;
}

/**
 * Chọn ảnh đại diện như web: chọn ảnh từ máy, cắt khổ 4x6, đọc lưu ý (ảnh có thể in lên chứng nhận), tích đồng ý rồi
 * mới dùng. Chỉ dành cho tài khoản không gắn huynh trưởng (như web); ảnh huynh trưởng sửa ở hồ sơ huynh trưởng.
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
  const { colors } = useTheme();
  const deps = useAccountDependencies();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [picked, setPicked] = useState<Picked | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setPicked(null);
    setConsent(false);
    setError(null);
    onClose();
  };

  const pick = async () => {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [2, 3],
        quality: 1,
      });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return;
      if (asset.fileSize && asset.fileSize > MAX_INPUT_BYTES) {
        setError('Ảnh quá lớn (tối đa 25 MB)');
        return;
      }
      // Một số máy (iOS) chỉ cắt vuông: cắt lại giữa ảnh cho đúng khổ 4x6 rồi thu nhỏ.
      const { width, height } = asset;
      const cropWidth = Math.min(width, Math.floor(height * ASPECT));
      const cropHeight = Math.min(height, Math.floor(width / ASPECT));
      const out = await ImageManipulator.manipulateAsync(
        asset.uri,
        [
          {
            crop: {
              originX: Math.floor((width - cropWidth) / 2),
              originY: Math.floor((height - cropHeight) / 2),
              width: cropWidth,
              height: cropHeight,
            },
          },
          { resize: { height: Math.min(MAX_HEIGHT, cropHeight) } },
        ],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );
      setPicked({ uri: out.uri, name: 'avatar.jpg', type: 'image/jpeg' });
    } catch {
      setError('Không đọc được ảnh, tệp có thể bị hỏng hoặc không đúng định dạng');
    }
  };

  const confirm = async () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      await deps.changeMyAvatar.execute(picked);
      await queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY });
      toast.success('Đã cập nhật ảnh đại diện');
      setBusy(false);
      close();
    } catch (exception) {
      setError(errorMessage(exception));
      toast.error(errorMessage(exception));
      setBusy(false);
    }
  };

  const shown = picked?.uri ?? currentUri;
  return (
    <BottomSheet
      visible={visible}
      title="Chọn ảnh đại diện"
      onClose={close}
      footer={
        <>
          <Button
            label="Dùng ảnh này"
            disabled={!picked || !consent}
            loading={busy}
            onPress={() => void confirm()}
          />
          <Button
            label={picked ? 'Chọn ảnh khác' : 'Chọn ảnh từ máy'}
            variant="outline"
            disabled={busy}
            onPress={() => void pick()}
          />
        </>
      }
    >
      <View style={{ gap: 12 }}>
        <Banner
          tone="warning"
          message="Ảnh đại diện có thể được in lên chứng nhận. Vui lòng chọn ảnh rõ mặt, mặc đúng đồng phục, đeo khăn quàng và đầu tóc gọn gàng."
        />
        <Text variant="secondary" tone="muted">
          Ảnh khổ 4x6 (dọc). Khi chọn ảnh, kéo và phóng to để căn vào khung.
        </Text>
        <View style={{ alignItems: 'center' }}>
          {shown ? (
            <Image
              accessibilityLabel={picked ? 'Ảnh mới chọn' : 'Ảnh hiện tại'}
              source={{ uri: shown }}
              contentFit="cover"
              style={{
                width: 120,
                height: 180,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: colors.primary,
              }}
            />
          ) : (
            <Text variant="secondary" tone="muted">
              Chưa có ảnh
            </Text>
          )}
        </View>
        {error ? <Banner tone="danger" message={error} /> : null}
        <ConsentCheckbox variant="self" checked={consent} onChange={setConsent} disabled={busy} />
      </View>
    </BottomSheet>
  );
}
