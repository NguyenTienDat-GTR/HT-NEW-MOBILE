import { useAuthStore } from './auth-store';
import { usePrivacyConsentGate } from './use-privacy-consent';

/** Màn hình mà người dùng được phép ở lúc này, suy ra từ trạng thái phiên và các cổng chặn sau đăng nhập. */
export type GateTarget =
  'loading' | 'login' | 'unreachable' | 'change-password' | 'privacy-consent' | 'home';

/**
 * Một nơi duy nhất quyết định cổng, dùng cho cả layout gốc (Stack.Protected) lẫn route "/".
 * Thứ tự: khôi phục phiên -> mất kết nối -> chưa đăng nhập -> đổi mật khẩu tạm -> đồng ý chính sách -> vào app.
 */
export function useGateTarget(): GateTarget {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  const authenticated = status === 'authenticated' && user !== null;
  const mustChangePassword = authenticated && user.mustChangePassword;
  const consent = usePrivacyConsentGate(authenticated && !mustChangePassword);

  if (status === 'booting') return 'loading';
  if (status === 'unreachable') return 'unreachable';
  if (!authenticated) return 'login';
  if (mustChangePassword) return 'change-password';
  if (consent.loading) return 'loading';
  if (consent.mustConsent) return 'privacy-consent';
  return 'home';
}
