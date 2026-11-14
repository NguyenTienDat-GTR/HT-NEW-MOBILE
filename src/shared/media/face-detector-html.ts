import type { FaceBox } from './face-crop';

/**
 * Trang HTML chạy trong WebView ẩn để dò mặt bằng MediaPipe, cùng bộ model và wasm mà web tự host ở `/mediapipe` (thư
 * viện `vision_bundle.mjs` cũng đặt ở đó). Nạp một lần; `window.detect(id, dataUrl)` trả kết quả qua postMessage.
 */
export function buildFaceDetectorHtml(origin: string): string {
  const base = JSON.stringify(`${origin}/mediapipe`);
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module">
const post = (message) => window.ReactNativeWebView.postMessage(JSON.stringify(message));
const base = ${base};
let detector = null;
try {
  const { FaceDetector, FilesetResolver } = await import(base + '/vision_bundle.mjs');
  const fileset = await FilesetResolver.forVisionTasks(base + '/wasm');
  detector = await FaceDetector.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: base + '/blaze_face_short_range.tflite', delegate: 'CPU' },
    runningMode: 'IMAGE',
    minDetectionConfidence: 0.5,
  });
  post({ type: 'ready' });
} catch (error) {
  post({ type: 'unavailable' });
}
window.detect = async (id, dataUrl) => {
  if (!detector) return post({ type: 'result', id, faces: null });
  try {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const faces = detector.detect(image).detections.flatMap((item) => {
      const box = item.boundingBox;
      return box ? [{ x: box.originX, y: box.originY, width: box.width, height: box.height }] : [];
    });
    post({ type: 'result', id, faces });
  } catch (error) {
    post({ type: 'result', id, faces: null });
  }
};
</script></body></html>`;
}

export type FaceDetectorMessage =
  | { type: 'ready' }
  | { type: 'unavailable' }
  | { type: 'result'; id: number; faces: FaceBox[] | null };

/** Đọc tin nhắn từ trang dò mặt; không hợp lệ thì null. */
export function parseFaceDetectorMessage(raw: string): FaceDetectorMessage | null {
  try {
    const data = JSON.parse(raw) as { type?: string; id?: unknown; faces?: unknown };
    if (data.type === 'ready') return { type: 'ready' };
    if (data.type === 'unavailable') return { type: 'unavailable' };
    if (data.type === 'result' && typeof data.id === 'number') {
      return {
        type: 'result',
        id: data.id,
        faces: Array.isArray(data.faces) ? (data.faces as FaceBox[]) : null,
      };
    }
  } catch {
    // Không phải JSON của trang dò mặt.
  }
  return null;
}
