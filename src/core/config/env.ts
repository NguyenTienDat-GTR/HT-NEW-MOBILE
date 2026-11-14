export interface AppEnv {
  /** Gốc API, đi qua Next.js của web: https://<host>/backend/api */
  apiBaseUrl: string;
  /** WebSocket STOMP thông báo. */
  wsUrl: string;
  /** Tên miền đã đăng ký khóa Turnstile; dùng làm baseUrl của WebView. */
  siteOrigin: string;
  requestTimeoutMs: number;
}

type RawEnv = Partial<
  Record<'EXPO_PUBLIC_API_BASE_URL' | 'EXPO_PUBLIC_WS_URL' | 'EXPO_PUBLIC_SITE_ORIGIN', string>
>;

/**
 * Đọc cấu hình từ biến môi trường. Không có địa chỉ mặc định trong mã (địa chỉ thật không nằm trong repo): thiếu biến nào
 * thì báo lỗi rõ ràng thay vì gọi nhầm máy chủ.
 */
export function parseEnv(raw: RawEnv): AppEnv {
  const missing = (
    ['EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_WS_URL', 'EXPO_PUBLIC_SITE_ORIGIN'] as const
  ).filter((name) => !raw[name]?.trim());
  if (missing.length > 0)
    throw new Error(
      `Thiếu cấu hình ${missing.join(', ')}. Sao chép .env.example thành .env.local rồi điền địa chỉ máy chủ (bản build EAS đặt trong biến môi trường của EAS).`,
    );
  return {
    apiBaseUrl: trimTrailingSlash(raw.EXPO_PUBLIC_API_BASE_URL!.trim()),
    wsUrl: raw.EXPO_PUBLIC_WS_URL!.trim(),
    siteOrigin: trimTrailingSlash(raw.EXPO_PUBLIC_SITE_ORIGIN!.trim()),
    requestTimeoutMs: 20_000,
  };
}

/** Biến EXPO_PUBLIC_* được Metro thay bằng giá trị lúc build, nên phải truy cập trực tiếp `process.env.EXPO_PUBLIC_X`. */
export function readEnv(): AppEnv {
  return parseEnv({
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_WS_URL: process.env.EXPO_PUBLIC_WS_URL,
    EXPO_PUBLIC_SITE_ORIGIN: process.env.EXPO_PUBLIC_SITE_ORIGIN,
  });
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
