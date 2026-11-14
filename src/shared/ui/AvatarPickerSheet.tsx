import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';

import { useTheme } from '../theme/theme-provider';

import { Banner } from './Banner';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { ConsentCheckbox } from './ConsentCheckbox';
import { Text } from './Text';

/** Khổ ảnh đại diện 4x6 (dọc), cao tối đa 720px như web (ảnh có thể in lên chứng nhận / thẻ). */
const ASPECT = 2 / 3;
const MAX_HEIGHT = 720;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

/** Tệp ảnh đã chọn và cắt sẵn trên máy (đường dẫn cục bộ). */
export interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

/**
 * Chọn ảnh đại diện như web: chọn ảnh từ máy, cắt khổ 4x6, đọc lưu ý (ảnh có thể in lên chứng nhận), rồi "Dùng ảnh
 * này". `requireConsent` = người dùng tự đặt ảnh của chính mình, phải tích đồng ý trước (ảnh huynh trưởng thì đồng ý
 * nằm ở biểu mẫu hồ sơ). `onConfirm` tải ảnh lên; ném lỗi thì sheet hiện lỗi và giữ nguyên để thử lại.
 */
export function AvatarPickerSheet({
  visible,
  currentUri,
  requireConsent = false,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  currentUri: string | null;
  requireConsent?: boolean;
  onClose: () => void;
  onConfirm: (file: PickedImage) => Promise<void>;
}) {
  const { colors } = useTheme();
  const [picked, setPicked] = useState<PickedImage | null>(null);
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
      await onConfirm(picked);
      setBusy(false);
      setPicked(null);
      setConsent(false);
      onClose();
    } catch (exception) {
      setError(errorMessage(exception));
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
            disabled={!picked || (requireConsent && !consent)}
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
        {requireConsent ? (
          <ConsentCheckbox variant="self" checked={consent} onChange={setConsent} disabled={busy} />
        ) : null}
      </View>
    </BottomSheet>
  );
}
