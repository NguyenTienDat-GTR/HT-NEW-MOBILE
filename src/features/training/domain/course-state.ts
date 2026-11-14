/**
 * Trạng thái của khóa huấn luyện: ưu tiên giá trị BE đã lưu, thiếu thì suy ra từ ngày (giờ Việt Nam, UTC+7).
 * Port từ FE/src/modules/training-courses/registration-state.ts để hai nền tảng hiển thị giống nhau.
 */
export type RegistrationState = 'OPEN' | 'CLOSED' | 'NOT_STARTED' | 'ENDED' | 'DISABLED';
export type OrganizingState = 'UPCOMING' | 'ONGOING' | 'ENDED';
export type StateTone = 'neutral' | 'success' | 'warning' | 'info';

export interface CourseStatusFields {
  registrationStatus?: unknown;
  registrationEnabled?: unknown;
  organizingStatus?: unknown;
  registrationStartAt?: unknown;
  registrationEndAt?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  finishedAt?: unknown;
}

export const REGISTRATION_LABELS: Record<RegistrationState, string> = {
  OPEN: 'Đang mở đăng ký',
  CLOSED: 'Đã đóng đăng ký',
  NOT_STARTED: 'Chưa đến giờ đăng ký',
  ENDED: 'Hết hạn đăng ký',
  DISABLED: 'Không mở đăng ký',
};

export const REGISTRATION_TONES: Record<RegistrationState, StateTone> = {
  OPEN: 'success',
  CLOSED: 'warning',
  NOT_STARTED: 'info',
  ENDED: 'neutral',
  DISABLED: 'neutral',
};

export const ORGANIZING_LABELS: Record<OrganizingState, string> = {
  UPCOMING: 'Sắp diễn ra',
  ONGOING: 'Đang diễn ra',
  ENDED: 'Đã kết thúc',
};

export const ORGANIZING_TONES: Record<OrganizingState, StateTone> = {
  UPCOMING: 'info',
  ONGOING: 'success',
  ENDED: 'neutral',
};

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const vnToday = (now: number) => new Date(now + VN_OFFSET_MS).toISOString().slice(0, 10);
const time = (value: unknown) => {
  if (typeof value !== 'string' || !value) return undefined;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? undefined : parsed;
};
const isRegistration = (value: unknown): value is RegistrationState =>
  typeof value === 'string' && value in REGISTRATION_LABELS;
const isOrganizing = (value: unknown): value is OrganizingState =>
  typeof value === 'string' && value in ORGANIZING_LABELS;

export function organizingState(row: CourseStatusFields, now = Date.now()): OrganizingState {
  if (isOrganizing(row.organizingStatus)) return row.organizingStatus;
  const today = vnToday(now);
  const start = typeof row.startDate === 'string' ? row.startDate : undefined;
  const end = typeof row.endDate === 'string' ? row.endDate : undefined;
  if (end && today > end) return 'ENDED';
  if (!start || today < start) return 'UPCOMING';
  return 'ONGOING';
}

export function registrationState(row: CourseStatusFields, now = Date.now()): RegistrationState {
  // Khóa đã diễn ra hoặc kết thúc thì đăng ký bắt buộc đã đóng (BE cũng ép như vậy).
  if (organizingState(row, now) !== 'UPCOMING') return 'ENDED';
  if (row.registrationEnabled === false) return 'DISABLED';
  if (isRegistration(row.registrationStatus)) return row.registrationStatus;
  const start = time(row.registrationStartAt);
  const end = time(row.registrationEndAt);
  if (end !== undefined && now > end) return 'ENDED';
  if (start !== undefined && now < start) return 'NOT_STARTED';
  return 'OPEN';
}

/** Khóa đã kết thúc (thủ công hoặc quá ngày kết thúc): BE không cho sửa. */
export function isCourseEnded(row: CourseStatusFields, now = Date.now()): boolean {
  if (row.finishedAt) return true;
  const end = typeof row.endDate === 'string' ? row.endDate : undefined;
  return (end !== undefined && vnToday(now) > end) || organizingState(row, now) === 'ENDED';
}

/** Ngày (yyyy-MM-dd) theo giờ Việt Nam của một mốc ISO có múi giờ; rỗng nếu không hợp lệ. */
export function vnDateOf(value: unknown): string {
  const parsed = time(value);
  return parsed === undefined ? '' : vnToday(parsed);
}

/** Ngày giờ (yyyy-MM-ddTHH:mm, giờ Việt Nam) của một mốc ISO có múi giờ; rỗng nếu không hợp lệ. */
export function vnLocalDateTimeOf(value: unknown): string {
  const parsed = time(value);
  return parsed === undefined ? '' : new Date(parsed + VN_OFFSET_MS).toISOString().slice(0, 16);
}

/** Ô chọn ngày giờ (yyyy-MM-ddTHH:mm, giờ Việt Nam) -> mốc ISO có múi giờ gửi BE. */
export const registrationIso = (localDateTime: string) => `${localDateTime}:00+07:00`;
