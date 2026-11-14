import { parseEnv } from './env';

const full = {
  EXPO_PUBLIC_API_BASE_URL: 'https://api.example.vn/backend/api/',
  EXPO_PUBLIC_WS_URL: 'wss://api.example.vn/ws/notifications',
  EXPO_PUBLIC_SITE_ORIGIN: 'https://api.example.vn/',
};

describe('cấu hình môi trường', () => {
  it('đọc đủ ba biến, bỏ dấu gạch chéo cuối', () => {
    expect(parseEnv(full)).toEqual({
      apiBaseUrl: 'https://api.example.vn/backend/api',
      wsUrl: 'wss://api.example.vn/ws/notifications',
      siteOrigin: 'https://api.example.vn',
      requestTimeoutMs: 20_000,
    });
  });

  it('thiếu hoặc rỗng thì báo lỗi nêu đúng tên biến, không có địa chỉ mặc định', () => {
    expect(() => parseEnv({})).toThrow(
      /EXPO_PUBLIC_API_BASE_URL, EXPO_PUBLIC_WS_URL, EXPO_PUBLIC_SITE_ORIGIN/,
    );
    expect(() => parseEnv({ ...full, EXPO_PUBLIC_WS_URL: '  ' })).toThrow(/EXPO_PUBLIC_WS_URL/);
  });
});
