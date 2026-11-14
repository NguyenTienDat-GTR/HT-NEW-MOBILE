import { createContext, useContext, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface InsetFlags {
  top: boolean;
  bottom: boolean;
}

const InsetFlagsContext = createContext<InsetFlags | null>(null);

export interface ScreenInsetsProps {
  /** Màn con còn phải tự chừa vùng an toàn phía trên (không có thanh tiêu đề của hệ điều hành/stack). */
  top: boolean;
  /** Màn con còn phải tự chừa vùng an toàn phía dưới (không có thanh tab dưới đã chừa sẵn). */
  bottom: boolean;
  children: React.ReactNode;
}

/**
 * Khai báo ai đã chừa vùng an toàn: thanh tiêu đề của stack lo phía trên, thanh tab dưới lo phía dưới. Nhờ đó khung
 * `Screen` và các danh sách chỉ chừa phần còn thiếu (nút home / thanh điều hướng của Android không che nút bấm), và
 * không chừa hai lần. Không có khai báo nào thì chừa cả hai phía.
 */
export function ScreenInsets({ top, bottom, children }: ScreenInsetsProps) {
  const value = useMemo(() => ({ top, bottom }), [top, bottom]);
  return <InsetFlagsContext.Provider value={value}>{children}</InsetFlagsContext.Provider>;
}

/** Khoảng vùng an toàn mà màn hình hiện tại còn phải tự chừa (dp). */
export function useScreenInsets(): { top: number; bottom: number } {
  const insets = useSafeAreaInsets();
  const flags = useContext(InsetFlagsContext);
  return {
    top: flags && !flags.top ? 0 : insets.top,
    bottom: flags && !flags.bottom ? 0 : insets.bottom,
  };
}
