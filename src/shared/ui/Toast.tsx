import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { CheckCircleIcon, WarningCircleIcon } from './icons';
import { useScreenInsets } from './screen-insets';
import { Text } from './Text';

/** Đủ lâu để đọc một câu ngắn, rồi tự ẩn (không chặn thao tác). */
const VISIBLE_MS = 3500;
/** Lỗi thường dài hơn và người dùng cần đọc kỹ: ở lâu hơn (như duration 10 giây của toast lỗi trên web). */
const ERROR_VISIBLE_MS = 8000;

interface ToastApi {
  /** Báo một việc vừa thành công (vd. "Lưu cập nhật thành công"). */
  success: (message: string) => void;
  /** Báo một thao tác thất bại (vd. lỗi từ máy chủ); ở lâu hơn thông báo thành công. */
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi>({ success: () => undefined, error: () => undefined });

/** Hiện thông báo ngắn ở đầu màn hình từ bất cứ màn nào (kể cả ngay trước khi quay lại màn trước). */
export function useToast(): ToastApi {
  return useContext(ToastContext);
}

/**
 * Khung thông báo ngắn dùng chung: một dòng nổi phía trên, tự ẩn sau vài giây, chạm để ẩn ngay. Có icon và chữ (không
 * chỉ dựa vào màu), đọc lên cho trình đọc màn hình và không lấy focus. Đặt một lần ở gốc app để thông báo vẫn còn
 * khi màn vừa gọi đã đóng (lưu form xong quay lại danh sách).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors, radius, spacing, iconSize } = useTheme();
  // Đặt ở gốc app (ngoài mọi khai báo ScreenInsets) nên luôn nhận đủ vùng an toàn phía trên (tai thỏ, thanh trạng thái).
  const insets = useScreenInsets();
  const [toast, setToast] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback((text: string, kind: 'success' | 'error') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ text, kind });
    AccessibilityInfo.announceForAccessibility(text);
    timer.current = setTimeout(
      () => {
        timer.current = null;
        setToast(null);
      },
      kind === 'error' ? ERROR_VISIBLE_MS : VISIBLE_MS,
    );
  }, []);
  const success = useCallback((text: string) => show(text, 'success'), [show]);
  const error = useCallback((text: string) => show(text, 'error'), [show]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const api = useMemo(() => ({ success, error }), [success, error]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <View
          style={[styles.host, { top: insets.top + spacing.xs, paddingHorizontal: spacing.md }]}
        >
          <Pressable
            accessibilityRole="alert"
            accessibilityLabel={toast.text}
            accessibilityHint="Chạm để ẩn thông báo"
            onPress={hide}
            style={[
              styles.toast,
              {
                backgroundColor:
                  toast.kind === 'error' ? colors.badge.dangerBg : colors.badge.successBg,
                borderColor: toast.kind === 'error' ? colors.danger : colors.success,
                borderRadius: radius.panel,
                shadowColor: colors.foreground,
              },
            ]}
          >
            {toast.kind === 'error' ? (
              <WarningCircleIcon size={iconSize.md} color={colors.danger} weight="bold" />
            ) : (
              <CheckCircleIcon size={iconSize.md} color={colors.success} weight="bold" />
            )}
            <Text
              variant="label"
              style={[
                styles.text,
                { color: toast.kind === 'error' ? colors.badge.dangerFg : colors.badge.successFg },
              ]}
            >
              {toast.text}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  // box-none: chỉ chính thông báo nhận chạm, phần còn lại của dải ngang vẫn bấm xuyên qua được.
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
    // Nổi trên mọi màn và thanh tiêu đề (Android xếp theo elevation).
    zIndex: 1000,
    elevation: 10,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    maxWidth: 480,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    elevation: 4,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  text: { flexShrink: 1 },
});
