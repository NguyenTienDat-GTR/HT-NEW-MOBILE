import type { FormFieldDef } from './types';

/**
 * Ô xác nhận của quản trị viên khi nhập hộ dữ liệu cá nhân của người khác (form có consentAttestation ở web): luôn bắt đầu
 * chưa tích, không tích thì không lưu được; khi gửi kèm subjectConsentConfirmed = true để BE ghi bằng chứng.
 */
export const CONSENT_FIELD: FormFieldDef = {
  name: 'subjectConsentConfirmed',
  label: 'Xác nhận đồng ý xử lý dữ liệu cá nhân',
  kind: 'consent',
  validate: (value) => (value === true ? null : 'Vui lòng xác nhận trước khi lưu'),
};
