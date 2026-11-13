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
    requirement: 'Điều kiện khóa',
    course_type: 'Loại khóa huấn luyện',
    role: 'Vai trò',
    role_permission: 'Phân quyền vai trò',
    score_component: 'Thành phần điểm',
    score_formula: 'Công thức điểm',
    session: 'Phiên đăng nhập',
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

export function auditOperationLabel(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  return (
    AUDIT_OPERATION_LABELS[value] ??
    value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^./, (letter) => letter.toUpperCase())
  );
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
