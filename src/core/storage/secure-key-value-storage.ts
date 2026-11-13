import * as SecureStore from 'expo-secure-store';

import type { KeyValueStorage } from './key-value-storage';

/**
 * Adapter Keychain (iOS) / Keystore (Android) qua expo-secure-store.
 * Khóa chỉ được chứa chữ-số, `.`, `-`, `_`. Mỗi giá trị nên nhỏ (vài trăm byte tới ~2KB) nên token lưu riêng từng khóa.
 */
export class SecureKeyValueStorage implements KeyValueStorage {
  async get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  }

  async set(key: string, value: string): Promise<void> {
    // AFTER_FIRST_UNLOCK: vẫn đọc được token khi app nhận push lúc máy khóa nhưng đã mở khóa một lần.
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  }

  async remove(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  }
}
