export type AppErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'rate_limited'
  | 'server'
  | 'unknown';

export interface AppErrorOptions {
  status?: number;
  /** errorCode do BE trả (VALIDATION_ERROR, INVALID_TOKEN…). */
  code?: string | null;
  /** Dữ liệu kèm theo (vd. map lỗi theo trường khi validation). */
  details?: unknown;
}

/** Lỗi thống nhất của app. `message` luôn là tiếng Việt, hiển thị được ngay cho người dùng. */
export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly status?: number;
  readonly code?: string | null;
  readonly details?: unknown;

  constructor(kind: AppErrorKind, message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.kind = kind;
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

const FALLBACK_MESSAGE = 'Không thể hoàn tất yêu cầu';

export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : FALLBACK_MESSAGE;
}

/** Lỗi validation của BE: `data` là map {tênTrường: thông báo}. Trả về map rỗng nếu không đúng dạng. */
export function fieldErrorsOf(error: unknown): Record<string, string> {
  if (!isAppError(error) || error.kind !== 'validation') return {};
  const details = error.details;
  if (!details || typeof details !== 'object' || Array.isArray(details)) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === 'string') result[key] = value;
  }
  return result;
}
