import { AppError } from '../domain/app-error';

import { SessionCoordinator } from './session-coordinator';
import { SessionEvents, type SessionTokens, type TokenRefresher, type TokenStore } from './session';

class FakeStore implements TokenStore {
  cleared = false;
  constructor(public tokens: SessionTokens | null) {}
  async load() {
    return this.tokens;
  }
  async save(tokens: SessionTokens) {
    this.tokens = tokens;
  }
  async clear() {
    this.tokens = null;
    this.cleared = true;
  }
}

const NOW = 1_000_000;
const fresh = (accessToken = 'a1', expiresIn = 600_000): SessionTokens => ({
  accessToken,
  refreshToken: 'r1',
  accessTokenExpiresAt: NOW + expiresIn,
  refreshTokenExpiresAt: NOW + 86_400_000,
});

function setup(tokens: SessionTokens | null, refresh: TokenRefresher['refresh']) {
  const store = new FakeStore(tokens);
  const events = new SessionEvents();
  const expired = jest.fn();
  events.on('expired', expired);
  const refresher: TokenRefresher = { refresh };
  return {
    store,
    expired,
    coordinator: new SessionCoordinator(store, refresher, events, () => NOW),
  };
}

describe('SessionCoordinator', () => {
  it('trả access token còn hạn mà không refresh', async () => {
    const refresh = jest.fn();
    const { coordinator } = setup(fresh(), refresh);
    await expect(coordinator.getAccessToken()).resolves.toBe('a1');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refresh sớm khi access token sắp hết hạn', async () => {
    const refresh = jest.fn().mockResolvedValue(fresh('a2'));
    const { coordinator, store } = setup(fresh('a1', 10_000), refresh);
    await expect(coordinator.getAccessToken()).resolves.toBe('a2');
    expect(store.tokens?.accessToken).toBe('a2');
  });

  it('nhiều request cùng cần refresh thì chỉ gọi BE một lần (single-flight)', async () => {
    let resolve!: (tokens: SessionTokens) => void;
    const refresh = jest.fn(() => new Promise<SessionTokens>((r) => (resolve = r)));
    const { coordinator } = setup(fresh('a1', 0), refresh);
    const calls = [
      coordinator.getAccessToken(),
      coordinator.getAccessToken(),
      coordinator.getAccessToken(),
    ];
    await Promise.resolve();
    resolve(fresh('a2'));
    await expect(Promise.all(calls)).resolves.toEqual(['a2', 'a2', 'a2']);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refresh bị từ chối: xóa phiên, phát sự kiện expired, ném unauthorized', async () => {
    const refresh = jest
      .fn()
      .mockRejectedValue(new AppError('unauthorized', 'hết hạn', { status: 401 }));
    const { coordinator, store, expired } = setup(fresh('a1', 0), refresh);
    await expect(coordinator.getAccessToken()).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(store.cleared).toBe(true);
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('mất mạng khi refresh: giữ phiên, không phát expired', async () => {
    const refresh = jest.fn().mockRejectedValue(new AppError('network', 'mất mạng'));
    const { coordinator, store, expired } = setup(fresh('a1', 0), refresh);
    await expect(coordinator.getAccessToken()).rejects.toMatchObject({ kind: 'network' });
    expect(store.cleared).toBe(false);
    expect(expired).not.toHaveBeenCalled();
  });

  it('refreshAfterRejection dùng token mới của request khác thay vì refresh lần nữa', async () => {
    const refresh = jest.fn();
    const { coordinator } = setup(fresh('a2'), refresh);
    await expect(coordinator.refreshAfterRejection('a1')).resolves.toBe('a2');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('chưa có phiên thì ném unauthorized', async () => {
    const { coordinator } = setup(null, jest.fn());
    await expect(coordinator.getAccessToken()).rejects.toMatchObject({ kind: 'unauthorized' });
  });
});
