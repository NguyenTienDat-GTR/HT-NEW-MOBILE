import type { KeyValueStorage } from '../storage/key-value-storage';

import type { SessionTokens, TokenStore } from './session';

const ACCESS_KEY = 'clead.access';
const REFRESH_KEY = 'clead.refresh';
const EXPIRY_KEY = 'clead.expiry';

/** Lưu token qua KeyValueStorage (Keychain/Keystore). Mỗi token một khóa để không vượt giới hạn kích thước giá trị. */
export class StorageTokenStore implements TokenStore {
  constructor(private readonly storage: KeyValueStorage) {}

  async load(): Promise<SessionTokens | null> {
    const [accessToken, refreshToken, expiry] = await Promise.all([
      this.storage.get(ACCESS_KEY),
      this.storage.get(REFRESH_KEY),
      this.storage.get(EXPIRY_KEY),
    ]);
    if (!accessToken || !refreshToken || !expiry) return null;
    const [accessExp, refreshExp] = expiry.split(':').map(Number);
    if (!Number.isFinite(accessExp) || !Number.isFinite(refreshExp)) return null;
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: accessExp as number,
      refreshTokenExpiresAt: refreshExp as number,
    };
  }

  async save(tokens: SessionTokens): Promise<void> {
    await Promise.all([
      this.storage.set(ACCESS_KEY, tokens.accessToken),
      this.storage.set(REFRESH_KEY, tokens.refreshToken),
      this.storage.set(
        EXPIRY_KEY,
        `${tokens.accessTokenExpiresAt}:${tokens.refreshTokenExpiresAt}`,
      ),
    ]);
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.storage.remove(ACCESS_KEY),
      this.storage.remove(REFRESH_KEY),
      this.storage.remove(EXPIRY_KEY),
    ]);
  }
}
