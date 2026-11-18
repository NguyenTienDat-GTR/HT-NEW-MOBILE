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
  /** Giờ bắt đầu / kết thúc (HH:mm, giờ Việt Nam); khóa cũ chưa có giờ tính 00:00 và 23:59. */
  startTime?: unknown;
  endTime?: unknown;
  pastCourse?: unknown;
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
const vnNowLocal = (now: number) => new Date(now + VN_OFFSET_MS).toISOString().slice(0, 16);
const timeOf = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : fallback;

/** Mốc bắt đầu / kết thúc của khóa dạng yyyy-MM-ddTHH:mm (giờ Việt Nam); undefined nếu chưa có ngày. */
export function courseStartLocal(row: CourseStatusFields): string | undefined {
  return typeof row.startDate === 'string' && row.startDate
    ? `${row.startDate.slice(0, 10)}T${timeOf(row.startTime, '00:00')}`
    : undefined;
}

export function courseEndLocal(row: CourseStatusFields): string | undefined {
  return typeof row.endDate === 'string' && row.endDate
    ? `${row.endDate.slice(0, 10)}T${timeOf(row.endTime, '23:59')}`
    : undefined;
}

/** "08:00 10/12/2026"; khóa quá khứ hoặc chưa có giờ thì chỉ "10/12/2026"; rỗng nếu chưa có ngày. */
export function formatCourseMoment(row: CourseStatusFields, which: 'start' | 'end'): string {
  const date = which === 'start' ? row.startDate : row.endDate;
  const clock = which === 'start' ? row.startTime : row.endTime;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(date)) return '';
  const [year, month, day] = date.slice(0, 10).split('-');
  const text = `${day}/${month}/${year}`;
  return row.pastCourse === true || typeof clock !== 'string' || !clock
    ? text
    : `${clock.slice(0, 5)} ${text}`;
}

/** "08:00 10/12/2026 – 17:30 12/12/2026". */
export function formatCoursePeriod(row: CourseStatusFields): string {
  return [formatCourseMoment(row, 'start'), formatCourseMoment(row, 'end')]
    .filter(Boolean)
    .join(' – ');
}
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
  const current = vnNowLocal(now);
  const start = courseStartLocal(row);
  const end = courseEndLocal(row);
  if (end && current > end) return 'ENDED';
  if (!start || current < start) return 'UPCOMING';
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

/** Khóa đã kết thúc (thủ công hoặc quá giờ kết thúc): BE không cho sửa. */
export function isCourseEnded(row: CourseStatusFields, now = Date.now()): boolean {
  if (row.finishedAt) return true;
  const end = courseEndLocal(row);
  return (end !== undefined && vnNowLocal(now) > end) || organizingState(row, now) === 'ENDED';
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
