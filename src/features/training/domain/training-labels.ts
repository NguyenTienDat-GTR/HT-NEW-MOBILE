import type { StateTone } from './course-state';

export interface LabeledTone {
  label: string;
  tone: StateTone | 'danger' | 'violet' | 'sky';
}

const PARTICIPATION: Record<string, LabeledTone> = {
  REGISTERED: { label: 'Đã đăng ký', tone: 'info' },
  ATTENDED: { label: 'Đã tham dự', tone: 'success' },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
};

const APPROVAL: Record<string, LabeledTone> = {
  NOT_REQUIRED: { label: 'Không yêu cầu', tone: 'neutral' },
  PENDING: { label: 'Chờ xử lý', tone: 'warning' },
  SUBMITTED: { label: 'Đã gửi', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
};

export const PARTICIPATION_OPTIONS = ['REGISTERED', 'ATTENDED', 'REJECTED'].map((value) => ({
  value,
  label: PARTICIPATION[value]!.label,
}));
export const PARTICIPANT_STATUS_OPTIONS = ['ATTENDED', 'COMPLETED'].map((value) => ({
  value,
  label: PARTICIPATION[value]!.label,
}));

export const participationLabel = (value: unknown): LabeledTone | null =>
  typeof value === 'string' ? (PARTICIPATION[value] ?? { label: value, tone: 'neutral' }) : null;

export const approvalLabel = (value: unknown): LabeledTone | null =>
  typeof value === 'string' ? (APPROVAL[value] ?? { label: value, tone: 'neutral' }) : null;

export const UNIT_LABELS: Record<string, string> = {
  DIOCESE: 'Giáo phận',
  DEANERY: 'Giáo hạt',
  PARISH: 'Giáo xứ',
};

export const unitLabel = (value: unknown): string =>
  typeof value === 'string' ? (UNIT_LABELS[value] ?? '') : '';

/** Nhãn cấp quản lý của khóa / loại khóa: giáo phận màu tím, giáo hạt màu xanh trời (như web); cấp khác thì không có nhãn. */
export function managementLevelBadge(value: unknown): LabeledTone | null {
  if (value === 'DIOCESE') return { label: UNIT_LABELS.DIOCESE as string, tone: 'violet' };
  if (value === 'DEANERY') return { label: UNIT_LABELS.DEANERY as string, tone: 'sky' };
  return null;
}

/** Kết quả cuối của hồ sơ trong khóa (đã kết thúc khóa mới có). */
export function finalResultLabel(value: unknown): LabeledTone | null {
  if (value === 'PASSED') return { label: 'Đạt, được thăng cấp', tone: 'success' };
  if (value === 'FAILED') return { label: 'Không đạt', tone: 'danger' };
  return null;
}

export const GENDER_LABELS: Record<string, string> = { NAM: 'Nam', NU: 'Nữ' };
