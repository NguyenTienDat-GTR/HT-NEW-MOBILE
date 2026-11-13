import type { SessionTokens, TokenStore } from '@/core/auth/session';
import { AppError } from '@/core/domain/app-error';

import { AuthRepositoryImpl } from './auth-repository-impl';
import type { AuthRemoteDataSource } from './auth-remote-data-source';

const NOW = 5_000;

class FakeTokenStore implements TokenStore {
  tokens: SessionTokens | null = null;
  async load() {
    return this.tokens;
  }
  async save(tokens: SessionTokens) {
    this.tokens = tokens;
  }
  async clear() {
    this.tokens = null;
  }
}

function setup(remote: Partial<Record<keyof AuthRemoteDataSource, jest.Mock>>) {
  const store = new FakeTokenStore();
  const repo = new AuthRepositoryImpl(
    remote as unknown as AuthRemoteDataSource,
    store,
    { get: async () => 'm-device' },
    () => NOW,
  );
  return { store, repo };
}

const loginDto = {
  accessToken: 'acc',
  refreshToken: 'ref',
  accessTokenExpiresInMs: 900_000,
  refreshTokenExpiresInMs: 604_800_000,
  user: {
    username: 'ht01',
    roles: ['ADMIN_PARISH'],
    permissions: ['a.b.c.parish'],
    mustChangePassword: true,
  },
};

describe('AuthRepositoryImpl', () => {
  it('login: gửi deviceId + turnstileToken, lưu token và đổi mốc hết hạn sang tuyệt đối', async () => {
    const login = jest.fn().mockResolvedValue(loginDto);
    const { repo, store } = setup({ login });
    const user = await repo.login({
      username: 'ht01',
      password: 'pw',
      rememberMe: true,
      turnstileToken: 'cf',
    });

    expect(login).toHaveBeenCalledWith({
      username: 'ht01',
      password: 'pw',
      rememberMe: true,
      deviceId: 'm-device',
      turnstileToken: 'cf',
    });
    expect(store.tokens).toEqual({
      accessToken: 'acc',
      refreshToken: 'ref',
      accessTokenExpiresAt: NOW + 900_000,
      refreshTokenExpiresAt: NOW + 604_800_000,
    });
    expect(user).toMatchObject({
      username: 'ht01',
      mustChangePassword: true,
      unitLocked: false,
      leaderId: null,
    });
  });

  it('login: không gửi turnstileToken khi không có', async () => {
    const login = jest.fn().mockResolvedValue(loginDto);
    await setup({ login }).repo.login({ username: 'u', password: 'p', rememberMe: false });
    expect(login.mock.calls[0][0]).not.toHaveProperty('turnstileToken');
  });

  it('restoreSession: chưa có token thì trả null và không gọi mạng', async () => {
    const me = jest.fn();
    await expect(setup({ me }).repo.restoreSession()).resolves.toBeNull();
    expect(me).not.toHaveBeenCalled();
  });

  it('restoreSession: 401 -> null; mất mạng -> ném lỗi để UI cho thử lại', async () => {
    const withTokens = (me: jest.Mock) => {
      const ctx = setup({ me });
      ctx.store.tokens = {
        accessToken: 'a',
        refreshToken: 'r',
        accessTokenExpiresAt: 1,
        refreshTokenExpiresAt: 2,
      };
      return ctx.repo;
    };
    await expect(
      withTokens(jest.fn().mockRejectedValue(new AppError('unauthorized', 'x'))).restoreSession(),
    ).resolves.toBeNull();
    await expect(
      withTokens(jest.fn().mockRejectedValue(new AppError('network', 'x'))).restoreSession(),
    ).rejects.toMatchObject({ kind: 'network' });
  });

  it('logout: vẫn xóa token cục bộ khi BE không phản hồi', async () => {
    const logout = jest.fn().mockRejectedValue(new AppError('network', 'x'));
    const { repo, store } = setup({ logout });
    store.tokens = {
      accessToken: 'a',
      refreshToken: 'r',
      accessTokenExpiresAt: 1,
      refreshTokenExpiresAt: 2,
    };
    await expect(repo.logout()).resolves.toBeUndefined();
    expect(logout).toHaveBeenCalledWith('r', 'a');
    expect(store.tokens).toBeNull();
  });

  it('changePassword: xóa phiên cục bộ vì BE thu hồi mọi phiên', async () => {
    const changePassword = jest.fn().mockResolvedValue(undefined);
    const { repo, store } = setup({ changePassword });
    store.tokens = {
      accessToken: 'a',
      refreshToken: 'r',
      accessTokenExpiresAt: 1,
      refreshTokenExpiresAt: 2,
    };
    await repo.changePassword('old', 'newpassword');
    expect(store.tokens).toBeNull();
  });
});
