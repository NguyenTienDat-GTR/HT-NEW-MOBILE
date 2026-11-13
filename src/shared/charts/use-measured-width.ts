import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/** Đo bề rộng thực của khung chứa biểu đồ (0 cho tới khi bố cục xong). Mọi kích thước biểu đồ suy ra từ số này. */
export function useMeasuredWidth(): [number, (event: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    setWidth((current) => (Math.abs(current - next) >= 1 ? next : current));
  }, []);
  return [width, onLayout];
}
