import { createApiError, networkError, timeoutError } from './api-error-factory';
import type { ApiEnvelope, HttpClient, HttpRequest, QueryValue } from './http-client';

export interface FetchHttpClientOptions {
  baseUrl: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

/** Adapter HTTP dùng fetch: JSON, thời gian chờ, bóc bao ngoài của BE và đổi lỗi sang AppError. */
export class FetchHttpClient implements HttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: FetchHttpClientOptions) {
    this.baseUrl = options.baseUrl;
    this.timeoutMs = options.timeoutMs;
    this.fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
  }

  async request<T>(request: HttpRequest): Promise<T> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    const onCallerAbort = () => controller.abort();
    request.signal?.addEventListener('abort', onCallerAbort);

    try {
      const headers: Record<string, string> = { accept: 'application/json', ...request.headers };
      let body: string | undefined;
      if (request.body !== undefined) {
        headers['content-type'] = 'application/json';
        body = JSON.stringify(request.body);
      }

      let response: Response;
      try {
        response = await this.fetchImpl(this.buildUrl(request), {
          method: request.method,
          headers,
          body,
          signal: controller.signal,
        });
      } catch (error) {
        if (timedOut) throw timeoutError();
        if (request.signal?.aborted) throw error;
        throw networkError();
      }

      const envelope = (await response.json().catch(() => null)) as Partial<ApiEnvelope<T>> | null;
      if (!response.ok || envelope?.success === false) {
        throw createApiError(response.status, envelope);
      }
      return envelope?.data as T;
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener('abort', onCallerAbort);
    }
  }

  private buildUrl(request: HttpRequest): string {
    const query = request.query ? serializeQuery(request.query) : '';
    return `${this.baseUrl}${request.path}${query ? `?${query}` : ''}`;
  }
}

/** Mảng được lặp tham số (searchFields=a&searchFields=b); bỏ qua null, undefined và chuỗi rỗng. */
export function serializeQuery(query: Record<string, QueryValue>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
    }
  }
  return parts.join('&');
}
