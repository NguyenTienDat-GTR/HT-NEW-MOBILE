import { formatDate } from '@/core/domain/date-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { optional } from '@/shared/resource/form-logic';
import { flag, formatDayMonth, text } from '@/shared/resource/row';
import type {
  DetailSection,
  FormFieldDef,
  FormValues,
  ToggleDefinition,
} from '@/shared/resource/types';

/** Điện thoại di động VN của đơn vị: 10 số, đầu 0, số thứ hai khác 0 (giống BE). */
const UNIT_PHONE = /^0[1-9]\d{8}$/;

export { CONSENT_FIELD } from '@/shared/resource/consent-field';

export const CONTACT_FIELDS: readonly FormFieldDef[] = [
  { name: 'chaplain', label: 'Cha tuyên úy', kind: 'text', maxLength: 100 },
  {
    name: 'phoneNumber',
    label: 'Số điện thoại',
    kind: 'text',
    keyboardType: 'number-pad',
    maxLength: 10,
    validate: (value) =>
      typeof value === 'string' && value.trim() !== '' && !UNIT_PHONE.test(value.trim())
        ? 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0'
        : null,
  },
  { name: 'email', label: 'Email', kind: 'email', maxLength: 100 },
];

export const MILESTONE_FIELDS: readonly FormFieldDef[] = [
  {
    name: 'patronSaintDay',
    label: 'Ngày bổn mạng',
    kind: 'daymonth',
    hint: 'Chỉ gồm ngày và tháng, không có năm.',
  },
  { name: 'establishmentDate', label: 'Ngày thành lập', kind: 'date', maxDate: 'today' },
];

const str = (row: ResourceRow | null, key: string): string => (row ? text(row, key) : '');

/** Giá trị ban đầu cho các trường chung của đơn vị. */
export function commonInitialValues(row: ResourceRow | null): FormValues {
  return {
    name: str(row, 'name'),
    chaplain: str(row, 'chaplain'),
    phoneNumber: str(row, 'phoneNumber'),
    email: str(row, 'email'),
    patronSaintDay: str(row, 'patronSaintDay'),
    establishmentDate: str(row, 'establishmentDate'),
    subjectConsentConfirmed: false,
  };
}

/** Thân gửi BE cho các trường chung: trường rỗng bị bỏ (BE không cho xóa giá trị đã nhập). */
export function commonBody(values: FormValues): Record<string, unknown> {
  return {
    name: optional(values, 'name'),
    chaplain: optional(values, 'chaplain'),
    phoneNumber: optional(values, 'phoneNumber'),
    email: optional(values, 'email'),
    patronSaintDay: optional(values, 'patronSaintDay'),
    establishmentDate: optional(values, 'establishmentDate'),
    subjectConsentConfirmed: true,
  };
}

export function contactSection(row: ResourceRow): DetailSection {
  return {
    title: 'Liên hệ',
    fields: [
      { label: 'Cha tuyên úy', value: text(row, 'chaplain') },
      { label: 'Số điện thoại', value: text(row, 'phoneNumber') },
      { label: 'Email', value: text(row, 'email') },
    ],
  };
}

export function milestoneFields(row: ResourceRow) {
  return [
    { label: 'Ngày bổn mạng', value: formatDayMonth(text(row, 'patronSaintDay')) },
    { label: 'Ngày thành lập', value: formatDate(text(row, 'establishmentDate')) },
  ];
}

export function auditSection(row: ResourceRow): DetailSection {
  return {
    title: 'Lịch sử ghi nhận',
    collapsed: true,
    fields: [
      { label: 'Người tạo', value: text(row, 'createdByName') },
      { label: 'Ngày tạo', value: formatDate(text(row, 'createdAt')) },
      { label: 'Người cập nhật', value: text(row, 'updatedByName') },
      { label: 'Ngày cập nhật', value: formatDate(text(row, 'updatedAt')) },
    ],
  };
}

const IMPACT_LABELS: readonly [key: string, label: string][] = [
  ['childDeaneries', 'Giáo hạt con đang bật'],
  ['childParishes', 'Giáo xứ con đang bật'],
  ['affectedAccounts', 'Tài khoản bị khóa'],
  ['leaders', 'Huynh trưởng'],
  ['openCourses', 'Khóa chưa kết thúc'],
  ['pendingRegistrations', 'Đăng ký chờ duyệt'],
  ['pendingCertificates', 'Chứng nhận chờ duyệt'],
];

/**
 * Bật/tắt đơn vị theo hợp đồng của web: xem tác động trước, tắt thì bắt buộc lý do (≤ 500 ký tự), luôn gõ "Xác nhận".
 * `noun` là từ chỉ đơn vị trong câu ("giáo phận", "giáo hạt", "giáo xứ").
 */
export function unitToggle(endpoint: string, noun: string): ToggleDefinition {
  const rowKey = (row: ResourceRow) => encodeURIComponent(text(row, 'id'));
  return {
    isActive: (row) => flag(row, 'status'),
    label: (row) => (flag(row, 'status') ? `Ngưng hoạt động ${noun}` : `Bật lại ${noun}`),
    confirmMessage: (row) =>
      flag(row, 'status')
        ? `Ngưng hoạt động ${noun} sẽ khóa các tài khoản thuộc đơn vị và các đơn vị con. Bạn có thể bật lại sau.`
        : `Bật lại ${noun}. Các tài khoản và đơn vị con ngưng theo đơn vị này được mở lại nếu không còn bị khóa riêng.`,
    confirmLabel: (row) => (flag(row, 'status') ? 'Ngưng hoạt động' : 'Bật lại'),
    successMessage: (row) =>
      flag(row, 'status') ? `Đã ngưng hoạt động ${noun}` : `Đã bật lại ${noun}`,
    reasonLabel: 'Lý do ngưng hoạt động',
    reasonPlaceholder: 'Ví dụ: sáp nhập giáo xứ, tạm ngưng theo quyết định…',
    requiresReason: (row) => flag(row, 'status'),
    requiresConfirmText: () => true,
    impact: async (gateway, row) => {
      if (!flag(row, 'status')) return [];
      const data = await gateway.call<Record<string, unknown>>(
        'GET',
        `${endpoint}/${rowKey(row)}/toggle-impact`,
      );
      return IMPACT_LABELS.filter(([key]) => Number(data[key] ?? 0) > 0).map(([key, label]) => ({
        label,
        value: String(data[key]),
      }));
    },
    run: (gateway, row, input) =>
      gateway.call('PATCH', `${endpoint}/${rowKey(row)}/toggle-status`, {
        body: flag(row, 'status')
          ? { confirmationText: input.confirmText, reason: input.reason }
          : { confirmationText: input.confirmText },
      }),
  };
}
