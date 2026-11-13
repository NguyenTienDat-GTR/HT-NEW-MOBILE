import type { KeyValueStorage } from './key-value-storage';

/**
 * CHỈ DÙNG KHI CHẠY BẢN WEB ĐỂ XEM THỬ GIAO DIỆN lúc phát triển (expo-secure-store không có trên web).
 * localStorage không an toàn bằng Keychain/Keystore; bản phát hành là app native nên không đi qua adapter này.
 */
export class WebKeyValueStorage implements KeyValueStorage {
  async get(key: string): Promise<string | null> {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Bỏ qua: bản xem thử vẫn chạy được, chỉ không nhớ phiên.
    }
  }

  async remove(key: string): Promise<void> {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Bỏ qua.
    }
  }
}
