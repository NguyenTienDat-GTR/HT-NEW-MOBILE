export type CertificateTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export interface CertificateLabel {
  label: string;
  tone: CertificateTone;
}

const STATUS: Record<string, CertificateLabel> = {
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  SUBMITTED: { label: 'Đã gửi, chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  REVOKED: { label: 'Đã thu hồi', tone: 'danger' },
};

export const certificateStatus = (value: unknown): CertificateLabel | null =>
  typeof value === 'string' ? (STATUS[value] ?? { label: value, tone: 'neutral' }) : null;

/** Trạng thái dùng làm bộ lọc ở danh sách chứng nhận (như web). */
export const CERTIFICATE_STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'].map(
  (value) => ({ value, label: STATUS[value]!.label }),
);

export function finalResultText(value: unknown): string {
  if (value === 'PASSED') return 'Đạt, được thăng cấp';
  if (value === 'FAILED') return 'Không đạt';
  return '';
}

export function revocationSourceText(value: unknown): string {
  if (value === 'COURSE_DISABLED')
    return 'Khóa huấn luyện bị vô hiệu hóa (tự mở lại khi bật lại khóa)';
  return value ? 'Thu hồi thủ công' : '';
}
