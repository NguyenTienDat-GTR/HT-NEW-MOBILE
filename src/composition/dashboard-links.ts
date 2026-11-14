import type { PermissionSubject } from '@/core/domain/permissions';

import { canSeeMenuEntry } from './menu-entries';

interface Target {
  /** Mã màn hình mobile (id tài nguyên). */
  resource: string;
  /** Bộ lọc chọn sẵn (khóa bộ lọc của màn đích -> giá trị). */
  filters?: Record<string, string>;
  /** Trạng thái hoạt động chọn sẵn của danh sách. */
  status?: 'active' | 'inactive';
}

const APPROVALS = 'approvals';
const SCORES = 'scores';
const COURSES = 'courses';
const CERTIFICATE_APPROVALS = 'certificate-approvals';
const LEADERS = 'leaders';
const PARISHES = 'parishes';

/**
 * Lối tắt từ tổng quan tới màn kèm bộ lọc chọn sẵn, theo khóa của mục (việc cần xử lý / điểm cần chú ý). Cùng bảng
 * với web (`FE/src/modules/analytics/dashboard-links.ts`); khóa bộ lọc là khóa của màn đích trên mobile.
 */
const TARGETS_BY_KEY: Readonly<Record<string, Target>> = {
  // Việc cần xử lý.
  pendingRegistrations: { resource: APPROVALS, filters: { approvalStatus: 'PENDING' } },
  rejectedRegistrations: { resource: APPROVALS, filters: { approvalStatus: 'REJECTED' } },
  // Danh sách chấm điểm chưa có bộ lọc "chưa chấm": "Không đạt" gồm cả hồ sơ chưa có điểm.
  pendingScoring: { resource: SCORES, filters: { result: 'UNCOMPLETED' } },
  closingCourses: { resource: COURSES, filters: { registrationStatus: 'OPEN' } },
  pendingCertificates: { resource: CERTIFICATE_APPROVALS, filters: { approvalStatus: 'PENDING' } },
  // Điểm cần chú ý.
  slowCertificateApprovals: {
    resource: CERTIFICATE_APPROVALS,
    filters: { approvalStatus: 'PENDING' },
  },
  highRejectionRate: { resource: CERTIFICATE_APPROVALS, filters: { approvalStatus: 'REJECTED' } },
  stalePendingApprovals: { resource: APPROVALS, filters: { approvalStatus: 'PENDING' } },
  scoringOverdue: { resource: SCORES, filters: { result: 'UNCOMPLETED' } },
  registrationClosingSoon: { resource: COURSES, filters: { registrationStatus: 'OPEN' } },
  lowPassRateCourses: { resource: COURSES, filters: { organizingStatus: 'ENDED' } },
  highCancellationCourses: { resource: COURSES },
  lowActiveRate: { resource: LEADERS, status: 'inactive' },
  youthShortage: { resource: LEADERS },
  genderImbalance: { resource: LEADERS },
  parishesWithoutLeaders: { resource: PARISHES },
  inactiveUnits: { resource: PARISHES, status: 'inactive' },
};

/** Khóa mục lạ: theo đường dẫn web BE trả -> màn mobile (không có bộ lọc). */
const RESOURCE_BY_WEB_PATH: Readonly<Record<string, string>> = {
  '/training/approvals': APPROVALS,
  '/training/scores': SCORES,
  '/training/courses': COURSES,
  '/certificates/approvals': CERTIFICATE_APPROVALS,
  '/leaders': LEADERS,
  '/organizations': PARISHES,
};

/** Đường dẫn mobile kèm bộ lọc: `/res/<màn>?filters=<JSON>&status=<...>`. */
function pathOf(target: Target): string {
  const query: string[] = [];
  if (target.filters && Object.keys(target.filters).length > 0)
    query.push(`filters=${encodeURIComponent(JSON.stringify(target.filters))}`);
  if (target.status) query.push(`status=${target.status}`);
  return `/res/${target.resource}${query.length > 0 ? `?${query.join('&')}` : ''}`;
}

function targetOf(key: string, href: string | null | undefined): Target | undefined {
  const byKey = TARGETS_BY_KEY[key];
  if (byKey) return byKey;
  const resource = RESOURCE_BY_WEB_PATH[href?.split('?')[0] ?? ''];
  return resource ? { resource } : undefined;
}

/**
 * Đường dẫn mở được trên mobile cho một mục của tổng quan (kèm bộ lọc chọn sẵn), hoặc null nếu màn đích không có hoặc
 * tài khoản không có quyền xem (mục chỉ hiển thị, không bấm được, thay vì mở màn báo lỗi quyền).
 */
export function dashboardHref(
  key: string,
  href: string | null | undefined,
  user: PermissionSubject | null | undefined,
): string | null {
  const target = targetOf(key, href);
  return target && canSeeMenuEntry(target.resource, user) ? pathOf(target) : null;
}
