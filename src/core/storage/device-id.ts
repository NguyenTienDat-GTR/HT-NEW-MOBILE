import { randomUUID } from 'expo-crypto';

import type { KeyValueStorage } from './key-value-storage';

const DEVICE_ID_KEY = 'clead.deviceId';
/** BE chấp nhận ^[A-Za-z0-9_-]{0,64}$ và dùng làm khóa nguồn phiên. */
const VALID_DEVICE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Mã thiết bị cố định theo cài đặt app: cùng một máy luôn chỉ chiếm một phiên ở BE. */
export interface DeviceIdProvider {
  get(): Promise<string>;
}

export class StoredDeviceIdProvider implements DeviceIdProvider {
  private cached: string | null = null;

  constructor(private readonly storage: KeyValueStorage) {}

  async get(): Promise<string> {
    if (this.cached) return this.cached;
    const stored = await this.storage.get(DEVICE_ID_KEY);
    if (stored && VALID_DEVICE_ID.test(stored)) {
      this.cached = stored;
      return stored;
    }
    const created = `m-${randomUUID()}`;
    await this.storage.set(DEVICE_ID_KEY, created);
    this.cached = created;
    return created;
  }
}
