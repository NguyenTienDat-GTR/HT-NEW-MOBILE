import type { PermissionSubject } from '@/core/domain/permissions';

import { canSeeMenuEntry } from './menu-entries';

/** Đường dẫn web mà BE gắn vào việc cần xử lý / điểm cần chú ý -> mã màn hình tương ứng trên mobile. */
const WEB_PATH_TO_RESOURCE: Readonly<Record<string, string>> = {
  '/training/approvals': 'approvals',
  '/training/scores': 'scores',
  '/training/courses': 'courses',
  '/certificates/approvals': 'certificate-approvals',
  '/leaders': 'leaders',
  '/organizations': 'parishes',
};

/**
 * Đường dẫn mở được trên mobile cho một href của BE, hoặc null nếu màn đích không có hoặc tài khoản không có quyền
 * xem (ô chỉ hiển thị, không bấm được, thay vì mở màn báo lỗi quyền).
 */
export function dashboardHref(
  href: string | null | undefined,
  user: PermissionSubject | null | undefined,
): string | null {
  if (!href) return null;
  const resource = WEB_PATH_TO_RESOURCE[href.split('?')[0] ?? ''];
  return resource && canSeeMenuEntry(resource, user) ? `/res/${resource}` : null;
}
