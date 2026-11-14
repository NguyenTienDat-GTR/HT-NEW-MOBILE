/**
 * Cắt ảnh chân dung khổ dọc 2:3 quanh khuôn mặt để người trong ảnh luôn nằm giữa khung. Cùng phép tính với web
 * (FE/src/lib/media/face-crop.ts) để ảnh chọn từ app và từ web cho kết quả như nhau. Hàm thuần, dễ kiểm thử.
 */
export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** ok: mặt rõ và ở giữa; no-face: không thấy mặt; multi-face: nhiều người; small: mặt quá nhỏ trong khung. */
export type CropStatus = 'ok' | 'no-face' | 'multi-face' | 'small';
/** Thêm no-detector: không dò được (không có mạng, chưa nạp được model). */
export type FaceStatus = CropStatus | 'no-detector';

const ASPECT = 2 / 3;
// Tâm mặt nằm ở ~38% chiều cao khung, chiều cao mặt chiếm ~40% khung.
const FACE_CENTER_Y = 0.38;
const FACE_HEIGHT_RATIO = 0.4;
// Khung cắt thấp hơn 360px trong ảnh gốc thì phải phóng to quá 2 lần ra khổ 480x720: ảnh bị mờ, nên báo xem lại.
const MIN_FRAME_HEIGHT = 360;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function largestFrame(width: number, height: number) {
  const frameHeight = Math.min(height, width / ASPECT);
  return { width: frameHeight * ASPECT, height: frameHeight };
}

export function computeFaceCrop(
  imageWidth: number,
  imageHeight: number,
  faces: readonly FaceBox[],
): { rect: CropRect; status: CropStatus } {
  const max = largestFrame(imageWidth, imageHeight);
  const first = faces[0];
  if (!first) {
    // Không thấy mặt: cắt giữa, dịch lên trên vì mặt thường ở nửa trên ảnh chân dung.
    return {
      rect: {
        x: (imageWidth - max.width) / 2,
        y: (imageHeight - max.height) * 0.25,
        width: max.width,
        height: max.height,
      },
      status: 'no-face',
    };
  }
  const face = faces.reduce(
    (largest, item) => (item.width * item.height > largest.width * largest.height ? item : largest),
    first,
  );
  const frameHeight = Math.min(max.height, face.height / FACE_HEIGHT_RATIO);
  const frameWidth = frameHeight * ASPECT;
  const centerX = face.x + face.width / 2;
  const centerY = face.y + face.height / 2;
  const x = clamp(centerX - frameWidth / 2, 0, imageWidth - frameWidth);
  const y = clamp(centerY - frameHeight * FACE_CENTER_Y, 0, imageHeight - frameHeight);
  const status: CropStatus =
    faces.length > 1 ? 'multi-face' : frameHeight < MIN_FRAME_HEIGHT ? 'small' : 'ok';
  return { rect: { x, y, width: frameWidth, height: frameHeight }, status };
}

/** Lưu ý hiện dưới khung ảnh (như FACE_NOTES của web). */
export const FACE_NOTES: Record<FaceStatus, { tone: 'ok' | 'warn'; text: string }> = {
  ok: {
    tone: 'ok',
    text: 'Đã tự căn khuôn mặt vào giữa khung. Nếu chưa vừa ý, bấm "Tự cắt ảnh" để tự chỉnh.',
  },
  'no-face': {
    tone: 'warn',
    text: 'Không tìm thấy khuôn mặt trong ảnh. Hãy chọn ảnh rõ mặt hoặc bấm "Tự cắt ảnh" để tự căn khuôn mặt vào giữa khung.',
  },
  'multi-face': {
    tone: 'warn',
    text: 'Ảnh có nhiều người, đã căn theo khuôn mặt lớn nhất. Nên dùng ảnh chỉ có một người.',
  },
  small: {
    tone: 'warn',
    text: 'Khuôn mặt quá nhỏ nên ảnh sẽ bị mờ. Hãy chọn ảnh chụp gần hơn.',
  },
  'no-detector': {
    tone: 'warn',
    text: 'Chưa nhận diện được khuôn mặt tự động (cần có mạng). Hãy bấm "Tự cắt ảnh" để tự kéo khuôn mặt vào giữa khung.',
  },
};
