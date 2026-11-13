import { AppError, type AppErrorKind } from '../domain/app-error';

import type { ApiEnvelope } from './http-client';

/** Thông báo mặc định theo mã HTTP, giống FE/src/lib/api/client.ts. Ưu tiên `message` do BE trả. */
const STATUS_MESSAGES: Record<number, string> = {
  401: 'Phiên đăng nhập đã hết hạn',
  403: 'Bạn không có quyền thực hiện thao tác này',
  404: 'Dữ liệu không còn tồn tại',
  409: 'Dữ liệu đã thay đổi, vui lòng tải lại',
  429: 'Hệ thống đang bận, vui lòng thử lại sau',
};

const GENERIC_MESSAGE = 'Không thể hoàn tất yêu cầu';

function kindOf(status: number, errorCode?: string | null): AppErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate_limited';
  if (status === 400 || status === 422 || errorCode === 'VALIDATION_ERROR') return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
}

/** Dựng AppError từ một response lỗi (status + phần thân đã parse, có thể null). */
export function createApiError(
  status: number,
  body: Partial<ApiEnvelope<unknown>> | null,
): AppError {
  const message = body?.message?.trim() || STATUS_MESSAGES[status] || GENERIC_MESSAGE;
  return new AppError(kindOf(status, body?.errorCode), message, {
    status,
    code: body?.errorCode,
    details: body?.data,
  });
}

export function networkError(): AppError {
  return new AppError('network', 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
}

export function timeoutError(): AppError {
  return new AppError('timeout', 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
}
