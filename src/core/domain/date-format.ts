/** Định dạng ngày giờ theo kiểu Việt Nam (dd/MM/yyyy). Thuần TypeScript, không phụ thuộc Intl (Hermes). */

const pad = (value: number) => String(value).padStart(2, '0');
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-11-13" -> "13/11/2026"; ISO có giờ -> theo múi giờ của máy. Rỗng/không hợp lệ -> "". */
export function formatDate(value?: string | null): string {
  if (!value) return '';
  const dateOnly = DATE_ONLY.exec(value);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** "13/11/2026 09:05". */
export function formatDateTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  return `${formatDate(value)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "Vừa xong", "5 phút trước", "3 giờ trước", "2 ngày trước", sau 7 ngày thì hiện ngày. */
export function relativeTime(value?: string | null, now = Date.now()): string {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return formatDate(value);
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** Ngày dd/MM/yyyy có tồn tại trên lịch không (kể cả năm nhuận). */
function isRealDate(day: number, month: number, year: number): boolean {
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return false;
  const max = month === 2 && isLeap(year) ? 29 : (DAYS_IN_MONTH[month - 1] as number);
  return day <= max;
}

/** "13/11/2026" -> "2026-11-13"; sai định dạng hoặc ngày không có thật -> null. */
export function parseVnDate(text: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return isRealDate(day, month, year) ? `${match[3]}-${pad(month)}-${pad(day)}` : null;
}

/** "13/11/2026 09:05" -> "2026-11-13T09:05"; sai định dạng, ngày hoặc giờ không có thật -> null. */
export function parseVnDateTime(text: string): string | null {
  const match = /^(\S+)\s+(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const date = parseVnDate(match[1] as string);
  const [hour, minute] = [Number(match[2]), Number(match[3])];
  if (!date || hour > 23 || minute > 59) return null;
  return `${date}T${pad(hour)}:${pad(minute)}`;
}

/** "2026-11-13T09:05" (giờ Việt Nam, không múi giờ) -> "13/11/2026 09:05"; không hợp lệ -> "". */
export function formatLocalDateTime(value?: string | null): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value ?? '');
  return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}` : '';
}

/**
 * Gõ tay ngày/giờ: tự thêm dấu "/" và khoảng trắng/":" để người dùng chỉ gõ chữ số
 * ("13112026" -> "13/11/2026", "131120260905" -> "13/11/2026 09:05").
 */
export function maskVnDateInput(raw: string, withTime: boolean): string {
  const digits = raw.replace(/\D/g, '').slice(0, withTime ? 12 : 8);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += `/${digits.slice(2, 4)}`;
  if (digits.length > 4) out += `/${digits.slice(4, 8)}`;
  if (withTime && digits.length > 8) out += ` ${digits.slice(8, 10)}`;
  if (withTime && digits.length > 10) out += `:${digits.slice(10, 12)}`;
  return out;
}
