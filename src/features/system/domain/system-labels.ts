export type SystemTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

/** Nhãn danh mục quyền (port từ FE/src/components/common/resource/permission-taxonomy-labels.ts). */
const TAXONOMY: Record<'module' | 'resource' | 'action' | 'scope', Record<string, string>> = {
  module: {
    analytics: 'Phân tích',
    auth: 'Xác thực',
    organization: 'Tổ chức',
    system: 'Hệ thống',
    training: 'Huấn luyện',
  },
  resource: {
    account: 'Tài khoản',
    analytics: 'Phân tích',
    auth: 'Xác thực',
    account_permission: 'Phân quyền tài khoản',
    account_role: 'Vai trò tài khoản',
    attendance: 'Điểm danh khóa huấn luyện',
    audit_log: 'Nhật ký hệ thống',
    badge_config: 'Cấu hình thẻ tham dự',
    certificate: 'Chứng nhận',
    certificate_config: 'Cấu hình chứng nhận',
    registration_template: 'File xuất danh sách đăng ký',
    leader_level: 'Cấp độ huynh trưởng',
    course: 'Khóa huấn luyện',
    dashboard: 'Dashboard phân tích',
    deanery: 'Giáo hạt',
    diocese: 'Giáo phận',
    executive_board_assignment: 'Phân công ban điều hành',
    leader: 'Huynh trưởng',
    leader_certificate: 'Chứng nhận trong hồ sơ huynh trưởng',
    notification: 'Thông báo',
    parish: 'Giáo xứ',
    participation: 'Tham dự khóa',
    permission: 'Quyền hạn',
    position: 'Chức vụ',
    course_type: 'Loại khóa huấn luyện',
    role: 'Vai trò',
    role_permission: 'Phân quyền vai trò',
    score_component: 'Thành phần điểm',
    session: 'Phiên đăng nhập',
    // Khóa đối tượng ghi trong nhật ký hệ thống (theo đường dẫn API, có thể ở dạng số nhiều).
    account_roles: 'Vai trò tài khoản',
    account_permissions: 'Phân quyền tài khoản',
    role_permissions: 'Phân quyền vai trò',
    requirement: 'Điều kiện khóa huấn luyện',
    badges: 'Thẻ tham dự',
    media: 'Ảnh và tệp',
    excel_jobs: 'Tiến trình Excel',
    executive_board: 'Ban điều hành',
    cross_deanery: 'Gửi liên giáo hạt',
    course_invitations: 'Lời mời khóa huấn luyện',
    search: 'Tìm kiếm',
    mobile: 'Ứng dụng di động',
  },
  action: {
    approve: 'Duyệt',
    assign: 'Gán',
    create: 'Tạo',
    create_past: 'Tạo khóa đã diễn ra',
    delete: 'Xóa',
    export: 'Xuất dữ liệu',
    finish: 'Kết thúc',
    lock: 'Khóa/mở',
    manage: 'Quản lý',
    manage_site_subdomain: 'Quản lý subdomain',
    read: 'Xem',
    reissue: 'Cấp lại',
    reset_password: 'Đặt lại mật khẩu',
    cross_approve: 'Đồng ý gửi liên giáo hạt',
    revoke: 'Thu hồi',
    scan: 'Quét điểm danh',
    score: 'Chấm điểm',
    submit: 'Gửi',
    toggle: 'Đổi trạng thái',
    transfer: 'Chuyển đơn vị',
    update: 'Cập nhật',
    update_birth_date: 'Sửa ngày sinh',
  },
  scope: {
    all: 'Toàn hệ thống',
    deanery: 'Giáo hạt',
    diocese: 'Giáo phận',
    own: 'Dữ liệu sở hữu',
    parish: 'Giáo xứ',
  },
};

export function taxonomyLabel(
  kind: 'module' | 'resource' | 'action' | 'scope',
  value: unknown,
): string {
  if (typeof value !== 'string' || !value) return '';
  return TAXONOMY[kind][value] ?? TAXONOMY[kind][value.toLowerCase()] ?? value;
}

export const AUDIT_OPERATION_LABELS: Record<string, string> = {
  LIST: 'Xem danh sách',
  VIEW: 'Xem chi tiết',
  CREATE: 'Tạo mới',
  UPDATE: 'Cập nhật',
  DELETE: 'Xóa',
  TOGGLE_STATUS: 'Bật/tắt trạng thái',
  APPROVE: 'Duyệt',
  REJECT: 'Từ chối',
  SUBMIT: 'Gửi',
  REVOKE: 'Thu hồi',
  REISSUE: 'Cấp lại',
  SCORE: 'Chấm điểm',
  SCORE_LOCK: 'Khóa/mở điểm',
  FINISH: 'Kết thúc khóa',
  LOGIN: 'Đăng nhập',
  LOGOUT: 'Đăng xuất',
  REFRESH: 'Làm mới phiên',
  WITHDRAW: 'Thu hồi đăng ký',
  EXPORT: 'Xuất dữ liệu',
};

// Thao tác ít gặp (đoạn cuối đường dẫn API); chỉ dùng để hiển thị, không đưa vào bộ lọc cho gọn.
const AUDIT_EXTRA_OPERATION_LABELS: Record<string, string> = {
  CANCEL: 'Hủy',
  TRANSFER: 'Chuyển đơn vị',
  RESOLVE_DUPLICATES: 'Xử lý trùng lặp',
  DIVIDE: 'Chia nhóm',
  SCAN: 'Quét điểm danh',
  LOOKUP: 'Tra cứu',
  RESET_PASSWORD: 'Đặt lại mật khẩu',
  DECISION: 'Quyết định',
  DIOCESE_APPROVAL: 'Giáo phận duyệt',
  DEANERY_APPROVAL: 'Giáo hạt duyệt',
  BULK_APPROVAL: 'Duyệt hàng loạt',
  BULK: 'Thao tác hàng loạt',
  IMPORT: 'Nhập từ Excel',
  PREVIEW: 'Xem trước',
  PREVIEW_PDF: 'Xem trước PDF',
  EXPORT_PDF: 'Xuất PDF',
  JOBS: 'Tạo tiến trình xuất',
  OTP: 'Gửi mã xác thực',
  VERIFY: 'Xác thực mã',
  CHANGE_PASSWORD: 'Đổi mật khẩu',
  PASSWORD: 'Mật khẩu',
  DEVICES: 'Đăng ký thiết bị',
  SEND: 'Gửi',
  RESET: 'Đặt lại',
  PARENT: 'Đổi đơn vị cha',
  PROMOTE: 'Thăng cấp',
  READ: 'Đánh dấu đã đọc',
  BIRTH_DATE: 'Sửa ngày sinh',
  REGISTRATION: 'Cập nhật đăng ký',
  SCORE_NOTE: 'Nhận xét điểm',
  REGISTRATION_NOTE: 'Ghi chú đăng ký',
  ASSIGNMENTS: 'Cập nhật phân công',
  REORDER: 'Sắp xếp thứ tự',
  DEFAULT: 'Đặt mặc định',
  SITE_SUBDOMAIN: 'Đổi tên miền con',
  FILE: 'Tải tệp lên',
  PROFILE: 'Cập nhật hồ sơ',
  EMAIL: 'Đổi email',
  AVATAR: 'Đổi ảnh đại diện',
  EXCEPTION_CERTIFICATE: 'Tạo chứng nhận ngoại lệ',
  PRIVACY_CONSENT: 'Đồng ý chính sách bảo mật',
  PREREQUISITE_COPY: 'Sao chép điều kiện',
  PAST: 'Tạo khóa đã diễn ra',
  REQUESTS: 'Gửi yêu cầu',
  REGISTRATIONS: 'Đăng ký tham dự',
  CHECK_IN: 'Điểm danh',
  STOP: 'Dừng',
};

export function auditOperationLabel(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  return AUDIT_OPERATION_LABELS[value] ?? AUDIT_EXTRA_OPERATION_LABELS[value] ?? 'Thao tác khác';
}

const HTTP_METHOD_LABELS: Record<string, string> = {
  GET: 'Xem dữ liệu',
  POST: 'Gửi dữ liệu',
  PUT: 'Cập nhật',
  PATCH: 'Cập nhật một phần',
  DELETE: 'Xóa',
};

/** Phương thức HTTP bằng tiếng Việt, kèm mã kỹ thuật trong ngoặc. */
export function auditMethodText(method: unknown): string {
  if (typeof method !== 'string' || !method) return '';
  const upper = method.toUpperCase();
  return HTTP_METHOD_LABELS[upper] ? `${HTTP_METHOD_LABELS[upper]} (${upper})` : method;
}

export function auditOperationTone(value: unknown): SystemTone {
  if (value === 'DELETE' || value === 'REJECT' || value === 'REVOKE') return 'danger';
  if (value === 'CREATE' || value === 'APPROVE') return 'success';
  if (value === 'LIST' || value === 'VIEW') return 'neutral';
  return 'info';
}

const STATUS_TEXT: Record<number, string> = {
  200: 'Thành công',
  201: 'Đã tạo',
  204: 'Thành công',
  400: 'Dữ liệu không hợp lệ',
  401: 'Chưa đăng nhập',
  403: 'Không đủ quyền',
  404: 'Không tìm thấy',
  409: 'Xung đột dữ liệu',
  422: 'Dữ liệu không hợp lệ',
  429: 'Quá nhiều yêu cầu',
  500: 'Lỗi hệ thống',
};

export function auditStatusText(code: number): string {
  return (
    STATUS_TEXT[code] ??
    (code < 300 ? 'Thành công' : code < 500 ? 'Yêu cầu bị từ chối' : 'Lỗi hệ thống')
  );
}

export function auditStatusTone(code: number): SystemTone {
  if (code < 400) return 'success';
  if (code < 500) return 'warning';
  return 'danger';
}

/** Tên đối tượng nếu có; không có thì mã đối tượng; cả hai đều không có (thao tác trên danh sách) thì rỗng. */
export function auditTargetText(row: Record<string, unknown>): string {
  const name = typeof row.resourceName === 'string' ? row.resourceName.trim() : '';
  if (name) return name;
  const id = typeof row.resourceId === 'string' ? row.resourceId.trim() : '';
  return id ? `Mã ${id}` : '';
}

/**
 * Nội dung tiếng Việt của một dòng nhật ký, dựng từ thao tác + loại đối tượng + tên đối tượng.
 * Trường `message` do BE ghi là chuỗi kỹ thuật ("GET /api/...") nên không hiển thị cho người dùng.
 */
export function auditMessageText(row: Record<string, unknown>): string {
  const head = [auditOperationLabel(row.operation), taxonomyLabel('resource', row.resource)]
    .filter(Boolean)
    .join(' ');
  return [head, auditTargetText(row)].filter(Boolean).join(': ');
}

/** Các loại đối tượng có thể gặp trong nhật ký, dùng cho bộ lọc. */
export const AUDIT_RESOURCE_KEYS = [
  'diocese',
  'deanery',
  'parish',
  'leader',
  'leader_level',
  'position',
  'executive_board_assignment',
  'course',
  'course_type',
  'score_component',
  'requirement',
  'participation',
  'certificate',
  'certificate_config',
  'registration_template',
  'account',
  'role',
  'permission',
  'notification',
  'audit_log',
  'analytics',
  'auth',
] as const;

export const AUDIT_UNIT_OPTIONS = [
  { value: 'DIOCESE', label: 'Giáo phận' },
  { value: 'DEANERY', label: 'Giáo hạt' },
  { value: 'PARISH', label: 'Giáo xứ' },
];

export const AUDIT_STATUS_CODE_OPTIONS = [200, 201, 400, 401, 403, 404, 409, 429, 500].map(
  (code) => ({ value: String(code), label: `${code} · ${auditStatusText(code)}` }),
);
