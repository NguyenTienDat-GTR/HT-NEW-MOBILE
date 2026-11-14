import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';

import { computeFaceCrop, FACE_NOTES, type FaceBox, type FaceStatus } from '../media/face-crop';
import { useFaceDetector } from '../media/use-face-detector';
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
/** Ảnh dùng để dò mặt thu nhỏ về cạnh dài tối đa này cho nhanh (như web). */
const DETECT_MAX_EDGE = 960;

const SAVE_JPEG = { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG } as const;

/** Tệp ảnh đã chọn và cắt sẵn trên máy (đường dẫn cục bộ). */
export interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

/**
 * Chọn ảnh đại diện như web: chọn ảnh từ máy, tự dò khuôn mặt (MediaPipe, như web) rồi căn khuôn mặt vào giữa khung
 * 4x6; hoặc "Tự cắt ảnh" bằng công cụ cắt của hệ điều hành. Có lưu ý (ảnh có thể in lên chứng nhận). `requireConsent`
 * = người dùng tự đặt ảnh của chính mình, phải tích đồng ý trước (ảnh huynh trưởng thì đồng ý nằm ở biểu mẫu hồ sơ).
 * `onConfirm` tải ảnh lên; ném lỗi thì sheet hiện lỗi và giữ nguyên để thử lại.
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
  const detector = useFaceDetector();
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [faceStatus, setFaceStatus] = useState<FaceStatus | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setPicked(null);
    setFaceStatus(null);
    setConsent(false);
    setError(null);
    onClose();
  };

  /** Chọn ảnh từ thư viện; null nếu hủy hoặc ảnh không hợp lệ (đã báo lỗi). */
  const choose = async (allowsEditing: boolean) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing,
      aspect: [2, 3],
      quality: 1,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return null;
    if (asset.fileSize && asset.fileSize > MAX_INPUT_BYTES) {
      setError('Ảnh quá lớn (tối đa 25 MB)');
      return null;
    }
    return asset;
  };

  /** Tự căn khuôn mặt: dò mặt trên bản thu nhỏ rồi cắt 2:3 quanh mặt lớn nhất trên ảnh gốc (giống web). */
  const pickWithFace = async () => {
    setError(null);
    try {
      const asset = await choose(false);
      if (!asset) return;
      setDetecting(true);
      // Chuẩn hóa chiều ảnh theo EXIF (ảnh chụp từ điện thoại hay bị xoay) trước khi dò và cắt.
      const upright = await ImageManipulator.manipulateAsync(asset.uri, [], SAVE_JPEG);
      const scale = Math.min(1, DETECT_MAX_EDGE / Math.max(upright.width, upright.height));
      const small = await ImageManipulator.manipulateAsync(
        upright.uri,
        scale < 1 ? [{ resize: { width: Math.round(upright.width * scale) } }] : [],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      const detected = small.base64
        ? await detector.detect(`data:image/jpeg;base64,${small.base64}`)
        : null;
      // Quy khung mặt từ ảnh thu nhỏ về toạ độ ảnh gốc.
      const ratio = upright.width / small.width;
      const faces: FaceBox[] = (detected ?? []).map((box) => ({
        x: box.x * ratio,
        y: box.y * ratio,
        width: box.width * ratio,
        height: box.height * ratio,
      }));
      const { rect, status } = computeFaceCrop(upright.width, upright.height, faces);
      const out = await ImageManipulator.manipulateAsync(
        upright.uri,
        [
          {
            crop: {
              originX: Math.round(rect.x),
              originY: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          },
          { resize: { height: Math.min(MAX_HEIGHT, Math.round(rect.height)) } },
        ],
        SAVE_JPEG,
      );
      setPicked({ uri: out.uri, name: 'avatar.jpg', type: 'image/jpeg' });
      setFaceStatus(detected === null ? 'no-detector' : status);
    } catch {
      setError('Không đọc được ảnh, tệp có thể bị hỏng hoặc không đúng định dạng');
    } finally {
      setDetecting(false);
    }
  };

  /** Tự cắt bằng công cụ cắt của hệ điều hành (kéo, phóng to khung 4x6). */
  const pickManually = async () => {
    setError(null);
    try {
      const asset = await choose(true);
      if (!asset) return;
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
        SAVE_JPEG,
      );
      setPicked({ uri: out.uri, name: 'avatar.jpg', type: 'image/jpeg' });
      setFaceStatus(null);
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
      setFaceStatus(null);
      setConsent(false);
      onClose();
    } catch (exception) {
      setError(errorMessage(exception));
      setBusy(false);
    }
  };

  const shown = picked?.uri ?? currentUri;
  const note = faceStatus ? FACE_NOTES[faceStatus] : null;
  return (
    <BottomSheet
      visible={visible}
      title="Chọn ảnh đại diện"
      onClose={close}
      footer={
        <>
          <Button
            label="Dùng ảnh này"
            disabled={!picked || detecting || (requireConsent && !consent)}
            loading={busy}
            onPress={() => void confirm()}
          />
          <Button
            label={picked ? 'Chọn ảnh khác' : 'Chọn ảnh từ máy'}
            variant="outline"
            disabled={busy || detecting}
            loading={detecting}
            onPress={() => void pickWithFace()}
          />
          <Button
            label="Tự cắt ảnh"
            variant="ghost"
            size="sm"
            disabled={busy || detecting}
            onPress={() => void pickManually()}
          />
        </>
      }
    >
      <View style={{ gap: 12 }}>
        {/* Trang dò mặt chạy ẩn khi sheet đang mở; nạp model một lần rồi dùng lại. */}
        {visible ? detector.view : null}
        <Banner
          tone="warning"
          message="Ảnh đại diện có thể được in lên chứng nhận. Vui lòng chọn ảnh rõ mặt, mặc đúng đồng phục, đeo khăn quàng và đầu tóc gọn gàng."
        />
        <Text variant="secondary" tone="muted">
          {
            'Ảnh khổ 4x6 (dọc). Khuôn mặt được tự căn vào giữa khung; bấm "Tự cắt ảnh" nếu muốn tự chỉnh.'
          }
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
        {detecting ? (
          <Text variant="secondary" tone="muted" accessibilityLiveRegion="polite">
            Đang nhận diện khuôn mặt…
          </Text>
        ) : null}
        {!detecting && note ? (
          <Banner tone={note.tone === 'ok' ? 'info' : 'warning'} message={note.text} />
        ) : null}
        {error ? <Banner tone="danger" message={error} /> : null}
        {requireConsent ? (
          <ConsentCheckbox variant="self" checked={consent} onChange={setConsent} disabled={busy} />
        ) : null}
      </View>
    </BottomSheet>
  );
}
