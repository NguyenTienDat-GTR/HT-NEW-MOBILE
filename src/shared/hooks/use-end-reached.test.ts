import type { NativeScrollEvent } from 'react-native';

import { END_THRESHOLD, isNearEnd } from './use-end-reached';

function scroll(offsetY: number, viewport = 800, content = 3000): NativeScrollEvent {
  return {
    contentOffset: { x: 0, y: offsetY },
    layoutMeasurement: { width: 360, height: viewport },
    contentSize: { width: 360, height: content },
  } as NativeScrollEvent;
}

describe('isNearEnd', () => {
  it('chưa tới gần đáy thì không tải tiếp', () => {
    expect(isNearEnd(scroll(0))).toBe(false);
    expect(isNearEnd(scroll(3000 - 800 - END_THRESHOLD - 1))).toBe(false);
  });

  it('còn cách đáy không quá ngưỡng thì tải tiếp', () => {
    expect(isNearEnd(scroll(3000 - 800 - END_THRESHOLD))).toBe(true);
    expect(isNearEnd(scroll(3000 - 800))).toBe(true);
  });

  it('nội dung ngắn hơn khung luôn coi là đã tới đáy', () => {
    expect(isNearEnd(scroll(0, 800, 500))).toBe(true);
  });
});
