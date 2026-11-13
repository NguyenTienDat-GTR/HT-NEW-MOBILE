import type { SessionCoordinator } from '../auth/session-coordinator';
import { isAppError } from '../domain/app-error';

import type { DownloadedBytes, HttpClient, HttpRequest } from './http-client';

/**
 * Decorator: gắn Bearer vào mọi request cần đăng nhập; gặp 401 thì làm mới phiên (single-flight) rồi gửi lại đúng một lần.
 * Request có `auth: false` đi thẳng qua client bên trong.
 */
export class AuthenticatedHttpClient implements HttpClient {
  constructor(
    private readonly inner: HttpClient,
    private readonly session: SessionCoordinator,
  ) {}

  request<T>(request: HttpRequest): Promise<T> {
    return this.withSession(request, (next) => this.inner.request<T>(next));
  }

  download(request: HttpRequest): Promise<DownloadedBytes> {
    return this.withSession(request, (next) => this.inner.download(next));
  }

  private async withSession<T>(
    request: HttpRequest,
    send: (request: HttpRequest) => Promise<T>,
  ): Promise<T> {
    if (request.auth === false) return send(request);

    const token = await this.session.getAccessToken();
    try {
      return await send(withBearer(request, token));
    } catch (error) {
      if (!isAppError(error) || error.kind !== 'unauthorized') throw error;
      const fresh = await this.session.refreshAfterRejection(token);
      return send(withBearer(request, fresh));
    }
  }
}

function withBearer(request: HttpRequest, token: string): HttpRequest {
  return { ...request, headers: { ...request.headers, authorization: `Bearer ${token}` } };
}
