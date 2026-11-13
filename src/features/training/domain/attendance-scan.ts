/**
 * Quét mã QR điểm danh. Port từ FE/src/modules/course-participants (scan-flow, scan-gate, attendance-token) và
 * FE/src/modules/qr-scan/scan-payload để hai nền tảng hiểu mã giống nhau.
 */

const PREFIX = 'HTATT2.';
const LEGACY_PREFIX = 'HTATT1.';

/** Mã điểm danh dạng "HTATT2.<mã khóa>.<mã hồ sơ>.<chữ ký>"; chỉ kiểm tra hình dạng, chữ ký do BE xác thực. */
export function attendanceTokenFromScan(raw: string): string | null {
  const line = (raw.split(/\r?\n/)[0] ?? '').trim();
  if (!line.startsWith(PREFIX)) return null;
  const parts = line.split('.');
  if (parts.length !== 4 || !parts[1] || !parts[2] || !parts[3]) return null;
  if (/\s/.test(line) || line.length > 200) return null;
  return line;
}

export const LEGACY_ATTENDANCE_MESSAGE =
  'Đây là mã QR điểm danh phiên bản cũ (chưa có thông tin khóa huấn luyện). Hãy xuất lại thẻ hoặc gửi lại email thông tin tham dự để có mã mới.';

/** Mã chứng nhận: link ".../certificates/<mã>" hoặc mã trơn của QR cũ. */
function certificateCodeFromQr(raw: string): string | null {
  const text = raw.trim();
  const link = /\/certificates\/([^/?#\s]+)/i.exec(text);
  if (link?.[1]) return decodeURIComponent(link[1]);
  return null;
}

export type ScanPayload =
  | { kind: 'attendance'; token: string }
  | { kind: 'certificate'; code: string }
  | { kind: 'legacy-attendance' }
  | { kind: 'unknown' };

/** Một ô quét cho cả hai loại mã. Chuỗi mang tiền tố HTATT không bao giờ bị coi là mã chứng nhận. */
export function classifyScan(raw: string): ScanPayload {
  const token = attendanceTokenFromScan(raw);
  if (token) return { kind: 'attendance', token };
  if (raw.trim().startsWith(LEGACY_PREFIX)) return { kind: 'legacy-attendance' };
  if (/^\s*HTATT\d/i.test(raw)) return { kind: 'unknown' };
  const code = certificateCodeFromQr(raw);
  return code ? { kind: 'certificate', code } : { kind: 'unknown' };
}

export const UNKNOWN_SCAN_MESSAGE =
  'Mã QR không phải mã điểm danh của hệ thống. Hãy quét mã trên thẻ tham dự hoặc trong email.';

export type ScanStatus = 'CHECKED_IN' | 'ALREADY_CHECKED_IN' | 'CHECK_IN_CANCELLED' | 'READY';

export interface ScanPerson {
  status: ScanStatus;
  participationId: string;
  courseCode: string;
  courseName: string;
  holyName: string | null;
  fullName: string;
  parishName: string | null;
  deaneryName: string | null;
  teamName: string | null;
  checkedInAt: string | null;
}

/** Luồng quét: quét -> tra cứu -> xác nhận -> điểm danh -> quét tiếp. */
export type ScanFlowState =
  | { step: 'scanning' }
  | { step: 'looking'; token: string }
  | { step: 'confirm'; token: string; person: ScanPerson }
  | { step: 'confirming'; token: string; person: ScanPerson }
  | { step: 'done'; person: ScanPerson }
  | { step: 'already'; person: ScanPerson }
  | { step: 'error'; message: string };

export type ScanFlowEvent =
  | { type: 'scanned'; token: string }
  | { type: 'looked-up'; person: ScanPerson }
  | { type: 'confirm' }
  | { type: 'confirmed'; person: ScanPerson }
  | { type: 'failed'; message: string }
  | { type: 'skip' }
  | { type: 'next' };

export const INITIAL_SCAN_FLOW: ScanFlowState = { step: 'scanning' };

export function scanFlowReducer(state: ScanFlowState, event: ScanFlowEvent): ScanFlowState {
  switch (event.type) {
    case 'scanned':
      // Chỉ nhận mã mới khi đang chờ quét, để camera không ghi đè kết quả đang hiển thị.
      return state.step === 'scanning' ? { step: 'looking', token: event.token } : state;
    case 'looked-up':
      if (state.step !== 'looking') return state;
      return event.person.status === 'ALREADY_CHECKED_IN'
        ? { step: 'already', person: event.person }
        : { step: 'confirm', token: state.token, person: event.person };
    case 'confirm':
      return state.step === 'confirm'
        ? { step: 'confirming', token: state.token, person: state.person }
        : state;
    case 'confirmed':
      return state.step === 'confirming' ? { step: 'done', person: event.person } : state;
    case 'failed':
      return state.step === 'looking' || state.step === 'confirming' || state.step === 'scanning'
        ? { step: 'error', message: event.message }
        : state;
    case 'skip':
      return state.step === 'confirm' ? INITIAL_SCAN_FLOW : state;
    case 'next':
      return state.step === 'done' || state.step === 'already' || state.step === 'error'
        ? INITIAL_SCAN_FLOW
        : state;
  }
}

/** Camera quét liên tục nên một mã bị đọc hàng chục lần mỗi giây: chỉ xử lý một lần trong khoảng chờ. */
export type ScanGate = { token: string; at: number } | null;
export const SCAN_COOLDOWN_MS = 3000;

export function shouldProcessScan(
  token: string,
  now: number,
  last: ScanGate,
  cooldownMs = SCAN_COOLDOWN_MS,
): boolean {
  if (!token) return false;
  if (!last || last.token !== token) return true;
  return now - last.at >= cooldownMs;
}
