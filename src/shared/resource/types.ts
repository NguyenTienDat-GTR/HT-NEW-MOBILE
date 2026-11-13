import type { ReactNode } from 'react';

import type { PermissionSubject } from '@/core/domain/permissions';
import type { ResourceGateway, ResourceRow } from '@/core/resource/resource-gateway';
import type { BadgeTone } from '../ui/Badge';
import type { SelectOption } from '../ui/SelectField';

/**
 * Định nghĩa một tài nguyên CRUD bằng cấu hình (Open/Closed): thêm màn danh sách/chi tiết/form mới là thêm một
 * ResourceDefinition, không sửa ResourceListScreen / ResourceDetailScreen / ResourceFormScreen.
 */
export type { ResourceRow, ResourceGateway, PermissionSubject, SelectOption };

export type FormValues = Record<string, string | boolean>;
export type FormMode = 'create' | 'edit';

export interface OptionsContext {
  gateway: ResourceGateway;
  values: FormValues;
  mode: FormMode;
  /** Dòng đang sửa (null khi tạo). */
  row: ResourceRow | null;
  /** Người dùng hiện tại (đơn vị, quyền) — vd. chỉ liệt kê cấp phân công mà họ có quyền. */
  subject: PermissionSubject | null;
}

/** Danh sách lựa chọn tĩnh hoặc tải từ BE (có thể phụ thuộc giá trị các trường khác). */
export type OptionsSource =
  | readonly SelectOption[]
  | { load: (context: OptionsContext) => Promise<SelectOption[]>; dependsOn?: readonly string[] };

export type FieldKind =
  | 'text'
  | 'email'
  | 'phone'
  | 'multiline'
  | 'date'
  | 'daymonth'
  | 'select'
  | 'switch'
  | 'lookup'
  | 'custom';

export interface FormFieldDef {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  hint?: string;
  maxLength?: number;
  /** Khóa khi sửa (vd. họ tên, cấp ban đầu): hiển thị nhưng không đổi được. */
  lockedOnEdit?: boolean;
  options?: OptionsSource;
  /** kind 'lookup': tìm bản ghi trên máy chủ theo từ khóa (danh sách quá dài để chọn trực tiếp). */
  lookup?: {
    search: (gateway: ResourceGateway, term: string) => Promise<SelectOption[]>;
    placeholder?: string;
  };
  visible?: (values: FormValues, mode: FormMode) => boolean;
  /** Trả thông báo lỗi tiếng Việt hoặc null. Chạy sau kiểm tra bắt buộc. */
  validate?: (value: string | boolean, values: FormValues, mode: FormMode) => string | null;
  /** Khi trường này đổi, xóa giá trị các trường liệt kê (vd. đổi giáo hạt thì xóa giáo xứ). */
  resets?: readonly string[];
  /** Chỉ dùng để lọc/hiển thị, không gửi lên BE. */
  excludeFromBody?: boolean;
  /** date: giới hạn; 'today' = không sau hôm nay. */
  maxDate?: 'today' | string;
  minDate?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  /** Khóa theo giá trị các trường khác (vd. khóa đã có hồ sơ thì không đổi loại khóa). */
  readOnlyWhen?: (values: FormValues, mode: FormMode) => boolean;
  /** kind 'custom': ô nhập riêng của tính năng; giá trị lưu dạng chuỗi (thường là JSON). */
  render?: (props: CustomFieldProps) => ReactNode;
}

export interface CustomFieldProps {
  value: string;
  values: FormValues;
  onChange: (value: string) => void;
  error?: string;
  locked: boolean;
}

export interface FormDefinition {
  titleCreate: string;
  titleEdit: string;
  /** Nhóm trường theo thứ tự hiển thị; trường không thuộc nhóm nào bị bỏ. */
  sections: readonly { title?: string; fields: readonly string[] }[];
  fields: readonly FormFieldDef[];
  initialValues: (row: ResourceRow | null, subject: PermissionSubject | null) => FormValues;
  /** Thân gửi BE; `row` là dòng đang sửa (null khi tạo). */
  toBody: (
    values: FormValues,
    mode: FormMode,
    row: ResourceRow | null,
    subject: PermissionSubject | null,
  ) => unknown;
  /** Thông báo thành công. */
  successCreate?: string;
  successEdit?: string;
  /** Gọi API khác endpoint chuẩn (mặc định POST endpoint / PUT endpoint/{id}). */
  submit?: (context: {
    gateway: ResourceGateway;
    values: FormValues;
    mode: FormMode;
    row: ResourceRow | null;
    body: unknown;
  }) => Promise<unknown>;
}

export interface CardView {
  title: string;
  subtitle?: string | null;
  /** Tối đa 2 dòng mô tả; phần còn lại nằm ở màn chi tiết. */
  lines?: readonly (string | null | undefined)[];
  badges?: readonly { label: string; tone?: BadgeTone }[];
}

export interface DetailField {
  label: string;
  value: string | null | undefined;
}

export interface DetailSection {
  title?: string;
  fields: readonly DetailField[];
  /** Nhóm thu gọn (mặc định mở). */
  collapsed?: boolean;
}

export interface ListFilterDef {
  /** Khóa trong filters JSON gửi BE (vd. "parish.deanery.id"). */
  key: string;
  label: string;
  options: OptionsSource;
  /** Khi một bộ lọc khác đổi, xóa bộ lọc này. */
  dependsOn?: readonly string[];
}

export interface ToggleImpactLine {
  label: string;
  value: string;
}

export interface ToggleDefinition {
  /** Tên hiển thị của hành động theo trạng thái hiện tại: "Tạm ngưng" / "Kích hoạt lại". */
  label: (row: ResourceRow) => string;
  /** Xem trước tác động (số đơn vị con, tài khoản…); không có thì bỏ qua. */
  impact?: (gateway: ResourceGateway, row: ResourceRow) => Promise<readonly ToggleImpactLine[]>;
  /** Có bắt buộc nhập lý do khi thực hiện (vd. ngưng hoạt động đơn vị)? */
  requiresReason?: (row: ResourceRow) => boolean;
  /** Gõ chữ "Xác nhận" mới cho phép thực hiện (thao tác nguy hiểm). */
  requiresConfirmText?: (row: ResourceRow) => boolean;
  run: (
    gateway: ResourceGateway,
    row: ResourceRow,
    input: { reason: string; confirmText: string },
  ) => Promise<unknown>;
  /** Câu hỏi xác nhận. */
  confirmMessage: (row: ResourceRow) => string;
  /** Trạng thái hiện tại đang bật? (quyết định chữ và độ nguy hiểm). */
  isActive: (row: ResourceRow) => boolean;
}

export interface ResourceDefinition {
  id: string;
  /** Tiêu đề danh sách (số nhiều) và tên một bản ghi (số ít, dùng cho nút "Thêm …"). */
  title: string;
  singular: string;
  endpoint: string;
  idField?: string;
  searchFields: readonly string[];
  searchPlaceholder: string;
  defaultSort?: { by: string; direction: 'ASC' | 'DESC' };
  /** Có bộ lọc Đang hoạt động / Tạm ngưng không. */
  statusFilter?: boolean;
  filters?: readonly ListFilterDef[];
  /** Bộ lọc luôn áp (không hiện cho người dùng), vd. chỉ hồ sơ chờ duyệt. Giá trị mảng = IN. */
  baseFilters?: Record<string, string | readonly string[]>;
  card: (row: ResourceRow) => CardView;
  detailTitle: (row: ResourceRow) => string;
  detailBadges?: (row: ResourceRow) => readonly { label: string; tone?: BadgeTone }[];
  detail: (row: ResourceRow) => readonly DetailSection[];
  form?: FormDefinition;
  toggle?: ToggleDefinition;
  canCreate: (subject: PermissionSubject | null) => boolean;
  canUpdate: (subject: PermissionSubject | null, row: ResourceRow) => boolean;
  canToggle: (subject: PermissionSubject | null, row: ResourceRow) => boolean;
  /** Khối bổ sung dưới chi tiết (vd. ban điều hành của đơn vị). */
  /** Thay cả màn tạo/sửa chung bằng màn riêng (vd. gửi đăng ký nhiều huynh trưởng). */
  renderForm?: (context: {
    def: ResourceDefinition;
    id?: string;
    /** Tham số đường dẫn khác `id` (vd. `course` để chọn sẵn khóa). */
    params: Record<string, string | undefined>;
    subject: PermissionSubject | null;
    onSaved: () => void;
  }) => ReactNode;
  /** Thay cả màn danh sách chung bằng màn riêng (vd. cấp độ: danh mục ngắn, có đổi thứ tự). */
  renderList?: (context: {
    def: ResourceDefinition;
    subject: PermissionSubject | null;
  }) => ReactNode;
  /** Thay cả màn chi tiết chung bằng màn riêng (vd. huynh trưởng có nhiều tab). */
  renderDetail?: (context: {
    def: ResourceDefinition;
    id: string;
    subject: PermissionSubject | null;
    onEdit: () => void;
  }) => ReactNode;
  renderDetailExtra?: (context: {
    row: ResourceRow;
    subject: PermissionSubject | null;
  }) => ReactNode;
}
