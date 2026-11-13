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
