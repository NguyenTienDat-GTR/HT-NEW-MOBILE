export interface AppEnv {
  /** Gốc API, đi qua Next.js của web: https://<host>/backend/api */
  apiBaseUrl: string;
  /** WebSocket STOMP thông báo. */
  wsUrl: string;
  /** Tên miền đã đăng ký khóa Turnstile; dùng làm baseUrl của WebView. */
  siteOrigin: string;
  requestTimeoutMs: number;
}

const DEFAULT_SITE_ORIGIN = 'https://clead.io.vn';

/** Biến EXPO_PUBLIC_* được Metro thay bằng giá trị lúc build, nên phải truy cập trực tiếp `process.env.EXPO_PUBLIC_X`. */
export function readEnv(): AppEnv {
  const siteOrigin = process.env.EXPO_PUBLIC_SITE_ORIGIN || DEFAULT_SITE_ORIGIN;
  return {
    apiBaseUrl: trimTrailingSlash(
      process.env.EXPO_PUBLIC_API_BASE_URL || `${DEFAULT_SITE_ORIGIN}/backend/api`,
    ),
    wsUrl: process.env.EXPO_PUBLIC_WS_URL || 'wss://clead.io.vn/ws/notifications',
    siteOrigin: trimTrailingSlash(siteOrigin),
    requestTimeoutMs: 20_000,
  };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
