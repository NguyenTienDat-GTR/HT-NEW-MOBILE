import { computeFaceCrop } from './face-crop';
import { buildFaceDetectorHtml, parseFaceDetectorMessage } from './face-detector-html';

describe('computeFaceCrop', () => {
  it('không có mặt: cắt giữa khổ 2:3, trạng thái no-face', () => {
    const { rect, status } = computeFaceCrop(1000, 1500, []);
    expect(status).toBe('no-face');
    expect(rect.width / rect.height).toBeCloseTo(2 / 3);
  });

  it('một mặt rõ: khung 2:3 nằm trong ảnh, chiều cao mặt ~40% khung', () => {
    const { rect, status } = computeFaceCrop(2000, 3000, [
      { x: 800, y: 600, width: 400, height: 500 },
    ]);
    expect(status).toBe('ok');
    expect(rect.width / rect.height).toBeCloseTo(2 / 3);
    expect(rect.height).toBeCloseTo(500 / 0.4);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(2000);
    expect(rect.y + rect.height).toBeLessThanOrEqual(3000);
  });

  it('nhiều mặt: căn theo mặt lớn nhất và báo multi-face', () => {
    const { rect, status } = computeFaceCrop(2000, 3000, [
      { x: 100, y: 100, width: 100, height: 100 },
      { x: 900, y: 900, width: 400, height: 500 },
    ]);
    expect(status).toBe('multi-face');
    expect(rect.height).toBeCloseTo(500 / 0.4);
  });

  it('mặt quá nhỏ: báo small', () => {
    const { status } = computeFaceCrop(2000, 3000, [{ x: 900, y: 900, width: 100, height: 120 }]);
    expect(status).toBe('small');
  });
});

describe('trang dò mặt', () => {
  it('trỏ tới thư viện, model và wasm đặt ở /mediapipe của web', () => {
    const html = buildFaceDetectorHtml('https://example.test');
    expect(html).toContain('https://example.test/mediapipe');
    expect(html).toContain('/vision_bundle.mjs');
    expect(html).toContain('blaze_face_short_range.tflite');
  });

  it('đọc tin nhắn hợp lệ, bỏ qua tin lạ', () => {
    expect(parseFaceDetectorMessage('{"type":"ready"}')).toEqual({ type: 'ready' });
    expect(
      parseFaceDetectorMessage(
        '{"type":"result","id":3,"faces":[{"x":1,"y":2,"width":3,"height":4}]}',
      ),
    ).toEqual({ type: 'result', id: 3, faces: [{ x: 1, y: 2, width: 3, height: 4 }] });
    expect(parseFaceDetectorMessage('{"type":"result","id":3,"faces":null}')).toEqual({
      type: 'result',
      id: 3,
      faces: null,
    });
    expect(parseFaceDetectorMessage('xyz')).toBeNull();
  });
});
