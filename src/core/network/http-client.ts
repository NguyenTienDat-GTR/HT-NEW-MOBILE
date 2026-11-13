export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue =
  string | number | boolean | null | undefined | readonly (string | number)[];

export interface HttpRequest {
  method: HttpMethod;
  /** Đường dẫn tương đối so với gốc API, bắt đầu bằng "/". */
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
  /** false = không gắn Bearer (đăng nhập, refresh, quên mật khẩu, captcha). Mặc định true. */
  auth?: boolean;
  signal?: AbortSignal;
}

/** Bao ngoài chung của BE: { success, message, errorCode?, data }. */
export interface ApiEnvelope<T> {
  success: boolean;
  message?: string | null;
  errorCode?: string | null;
  data: T;
  timestamp?: string;
}

/** Nội dung nhị phân tải về (vd. PDF chứng nhận). */
export interface DownloadedBytes {
  bytes: Uint8Array;
  contentType: string;
}

/** Cổng gọi HTTP. Trả về `data` đã bóc khỏi bao ngoài; lỗi được ném dưới dạng AppError. */
export interface HttpClient {
  request<T>(request: HttpRequest): Promise<T>;
  /** Tải nội dung nhị phân (không có bao ngoài JSON); lỗi của BE vẫn là AppError. */
  download(request: HttpRequest): Promise<DownloadedBytes>;
}
