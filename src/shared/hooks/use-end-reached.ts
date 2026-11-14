import { useRef } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** Còn cách đáy chừng này (dp) thì bắt đầu tải trang kế tiếp. */
export const END_THRESHOLD = 320;

export function isNearEnd({
  layoutMeasurement,
  contentOffset,
  contentSize,
}: NativeScrollEvent): boolean {
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - END_THRESHOLD;
}

export interface EndReachedScrollProps {
  onLayout?: (event: LayoutChangeEvent) => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
  onContentSizeChange?: (width: number, height: number) => void;
}

/**
 * Thuộc tính cho ScrollView để cuộn vô hạn: gọi `onEndReached` khi cuộn gần cuối, và cả khi nội dung chưa đầy khung
 * (không cuộn được) để tự tải tiếp cho tới khi đầy hoặc hết dữ liệu. `onEndReached` tự kiểm tra còn trang tiếp và
 * không đang tải. Không truyền `onEndReached` thì trả về đối tượng rỗng.
 */
export function useEndReached(onEndReached: (() => void) | undefined): EndReachedScrollProps {
  const viewportHeight = useRef(0);
  if (!onEndReached) return {};
  return {
    onLayout: (event) => {
      viewportHeight.current = event.nativeEvent.layout.height;
    },
    onScroll: (event) => {
      if (isNearEnd(event.nativeEvent)) onEndReached();
    },
    scrollEventThrottle: 100,
    onContentSizeChange: (_width, height) => {
      if (height <= viewportHeight.current + END_THRESHOLD) onEndReached();
    },
  };
}
