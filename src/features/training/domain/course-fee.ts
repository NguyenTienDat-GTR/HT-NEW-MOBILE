import { fmtNumber } from '@/core/domain/number-format';

/**
 * Lệ phí khóa huấn luyện (tiền Việt Nam đồng, số nguyên). Port từ FE/src/lib/money.ts và `feeAmountError` của form khóa
 * để hai nền tảng định dạng, đọc chữ và kiểm tra giống nhau. Không dùng Intl (Hermes trên Android có thể thiếu locale vi-VN).
 */

/** Lệ phí mỗi người tối đa, khớp ràng buộc phía BE (999.999.999 đồng). */
export const MAX_FEE_AMOUNT = 999_999_999;

/** 150000 -> "150.000" (không kèm đơn vị). */
export const formatVndNumber = (amount: number): string => fmtNumber(Math.trunc(amount));

/** 150000 -> "150.000 ₫". */
export const formatVnd = (amount: number): string => `${formatVndNumber(amount)} ₫`;

/** Chỉ giữ chữ số của chuỗi người dùng gõ / dán ("150.000 ₫" -> "150000"), bỏ số 0 đứng đầu, tối đa `maxDigits` chữ số. */
export function digitsOnly(text: string, maxDigits = 10): string {
  return text
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, maxDigits);
}

/** Số tiền từ chuỗi chữ số; rỗng hoặc không hợp lệ thì null (ô trống không bị coi là 0). */
export function amountFromDigits(digits: string): number | null {
  return /^\d+$/.test(digits) ? Number(digits) : null;
}

const DIGIT_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const GROUP_UNITS = ['', 'nghìn', 'triệu', 'tỷ'];

/** Đọc một nhóm ba chữ số. `full` = nhóm không đứng đầu: đọc cả "không trăm" và "lẻ". */
function readTriple(value: number, full: boolean): string {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const units = value % 10;
  const parts: string[] = [];
  if (hundreds > 0 || full) parts.push(`${DIGIT_WORDS[hundreds]} trăm`);
  if (tens === 0) {
    if (units > 0)
      parts.push(hundreds > 0 || full ? `lẻ ${DIGIT_WORDS[units]}` : DIGIT_WORDS[units]!);
  } else if (tens === 1) {
    parts.push(units === 0 ? 'mười' : units === 5 ? 'mười lăm' : `mười ${DIGIT_WORDS[units]}`);
  } else {
    const tail =
      units === 0
        ? ''
        : units === 1
          ? ' mốt'
          : units === 4
            ? ' tư'
            : units === 5
              ? ' lăm'
              : ` ${DIGIT_WORDS[units]}`;
    parts.push(`${DIGIT_WORDS[tens]} mươi${tail}`);
  }
  return parts.join(' ');
}

/** 150000 -> "Một trăm năm mươi nghìn đồng". Số âm, không nguyên hoặc quá lớn (≥ 1.000 tỷ) trả về chuỗi rỗng. */
export function vndToWords(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount >= 1_000_000_000_000) return '';
  if (amount === 0) return 'Không đồng';
  const groups: number[] = [];
  for (let rest = amount; rest > 0; rest = Math.floor(rest / 1000)) groups.push(rest % 1000);
  const words: string[] = [];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index]!;
    if (group === 0) continue;
    const isLeading = words.length === 0;
    words.push(`${readTriple(group, !isLeading)}${GROUP_UNITS[index] ? ` ${GROUP_UNITS[index]}` : ''}`);
  }
  const sentence = `${words.join(' ')} đồng`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** Lệ phí khi bật thu: số nguyên đồng lớn hơn 0 và không vượt giới hạn BE; để trống thì để quy tắc bắt buộc xử lý. */
export function feeAmountError(
  value: string | boolean,
  values: Record<string, string | boolean>,
): string | null {
  if (values.feeEnabled !== true || typeof value !== 'string' || value.trim() === '') return null;
  const amount = amountFromDigits(value.trim());
  if (amount === null || amount <= 0) return 'Lệ phí mỗi người phải lớn hơn 0 đồng';
  if (amount > MAX_FEE_AMOUNT) return 'Lệ phí mỗi người không được vượt quá 999.999.999 đồng';
  return null;
}

/** Thân gửi BE cho phần lệ phí của form khóa: tắt thì chỉ gửi cờ tắt (BE bỏ số tiền). */
export function feeBody(values: Record<string, string | boolean>): Record<string, unknown> {
  if (values.feeEnabled !== true) return { feeEnabled: false };
  const amount = amountFromDigits(typeof values.feeAmount === 'string' ? values.feeAmount.trim() : '');
  return amount === null ? { feeEnabled: true } : { feeEnabled: true, feeAmount: amount };
}
