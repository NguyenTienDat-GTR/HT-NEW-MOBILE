import type { SessionCoordinator } from '../auth/session-coordinator';
import { isAppError } from '../domain/app-error';

import type { HttpClient, HttpRequest } from './http-client';

/**
 * Decorator: gắn Bearer vào mọi request cần đăng nhập; gặp 401 thì làm mới phiên (single-flight) rồi gửi lại đúng một lần.
 * Request có `auth: false` đi thẳng qua client bên trong.
 */
export class AuthenticatedHttpClient implements HttpClient {
  constructor(
    private readonly inner: HttpClient,
    private readonly session: SessionCoordinator,
  ) {}

  async request<T>(request: HttpRequest): Promise<T> {
    if (request.auth === false) return this.inner.request<T>(request);

    const token = await this.session.getAccessToken();
    try {
      return await this.inner.request<T>(withBearer(request, token));
    } catch (error) {
      if (!isAppError(error) || error.kind !== 'unauthorized') throw error;
      const fresh = await this.session.refreshAfterRejection(token);
      return this.inner.request<T>(withBearer(request, fresh));
    }
  }
}

function withBearer(request: HttpRequest, token: string): HttpRequest {
  return { ...request, headers: { ...request.headers, authorization: `Bearer ${token}` } };
}
