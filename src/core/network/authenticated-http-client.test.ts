import { AppError } from '../domain/app-error';
import type { SessionCoordinator } from '../auth/session-coordinator';

import { AuthenticatedHttpClient } from './authenticated-http-client';
import type { HttpClient, HttpRequest } from './http-client';

function fakeSession(
  overrides: Partial<Record<'getAccessToken' | 'refreshAfterRejection', jest.Mock>> = {},
) {
  return {
    getAccessToken: jest.fn().mockResolvedValue('t1'),
    refreshAfterRejection: jest.fn().mockResolvedValue('t2'),
    ...overrides,
  } as unknown as SessionCoordinator & {
    getAccessToken: jest.Mock;
    refreshAfterRejection: jest.Mock;
  };
}

const unauthorized = () => new AppError('unauthorized', 'hết hạn', { status: 401 });

describe('AuthenticatedHttpClient', () => {
  it('gắn Bearer vào request cần đăng nhập', async () => {
    const inner: HttpClient = { request: jest.fn().mockResolvedValue('ok') };
    const client = new AuthenticatedHttpClient(inner, fakeSession());
    await client.request({ method: 'GET', path: '/me' });
    const sent = (inner.request as jest.Mock).mock.calls[0][0] as HttpRequest;
    expect(sent.headers?.authorization).toBe('Bearer t1');
  });

  it('request auth:false đi thẳng, không lấy token', async () => {
    const inner: HttpClient = { request: jest.fn().mockResolvedValue('ok') };
    const session = fakeSession();
    await new AuthenticatedHttpClient(inner, session).request({
      method: 'POST',
      path: '/login',
      auth: false,
    });
    expect(session.getAccessToken).not.toHaveBeenCalled();
  });

  it('gặp 401: làm mới phiên rồi gửi lại đúng một lần với token mới', async () => {
    const request = jest.fn().mockRejectedValueOnce(unauthorized()).mockResolvedValueOnce('done');
    const session = fakeSession();
    const result = await new AuthenticatedHttpClient({ request }, session).request({
      method: 'GET',
      path: '/x',
    });
    expect(result).toBe('done');
    expect(session.refreshAfterRejection).toHaveBeenCalledWith('t1');
    expect(request.mock.calls[1][0].headers.authorization).toBe('Bearer t2');
  });

  it('vẫn 401 sau khi gửi lại thì ném lỗi, không lặp vô hạn', async () => {
    const request = jest.fn().mockRejectedValue(unauthorized());
    await expect(
      new AuthenticatedHttpClient({ request }, fakeSession()).request({
        method: 'GET',
        path: '/x',
      }),
    ).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('lỗi khác 401 được ném nguyên, không refresh', async () => {
    const request = jest.fn().mockRejectedValue(new AppError('forbidden', 'cấm', { status: 403 }));
    const session = fakeSession();
    await expect(
      new AuthenticatedHttpClient({ request }, session).request({ method: 'GET', path: '/x' }),
    ).rejects.toMatchObject({
      kind: 'forbidden',
    });
    expect(session.refreshAfterRejection).not.toHaveBeenCalled();
  });
});
