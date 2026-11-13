import type { FormDefinition, FormFieldDef, FormMode, FormValues } from './types';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Số điện thoại VN: 10 chữ số, bắt đầu bằng 0 (giống FE edit-profile-dialog). */
export const PHONE_PATTERN = /^0\d{9}$/;

const pad = (n: number) => String(n).padStart(2, '0');

export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isEmpty(value: string | boolean | undefined): boolean {
  return (
    value === undefined || value === false || (typeof value === 'string' && value.trim() === '')
  );
}

/** "MM-dd" hợp lệ (có tính tháng 2 tối đa 29 ngày, vì ngày bổn mạng không kèm năm). */
export function isValidDayMonth(value: string): boolean {
  const match = /^(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1) return false;
  const daysIn = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] as number;
  return day <= daysIn;
}

export function isFieldVisible(field: FormFieldDef, values: FormValues, mode: FormMode): boolean {
  return field.visible ? field.visible(values, mode) : true;
}

/** Kiểm tra một trường: bắt buộc, định dạng theo kiểu, giới hạn ngày, rồi validate riêng. Trả lỗi tiếng Việt hoặc null. */
export function validateField(
  field: FormFieldDef,
  values: FormValues,
  mode: FormMode,
  today = todayIso(),
): string | null {
  if (!isFieldVisible(field, values, mode)) return null;
  const value = values[field.name] ?? (field.kind === 'switch' ? false : '');
  if (field.kind !== 'switch' && field.required && isEmpty(value)) {
    return field.kind === 'select' || field.kind === 'date' || field.kind === 'lookup'
      ? `Vui lòng chọn ${field.label.toLowerCase()}`
      : `Vui lòng nhập ${field.label.toLowerCase()}`;
  }
  if (typeof value === 'string' && value !== '') {
    const text = value.trim();
    if (field.kind === 'email' && !EMAIL_PATTERN.test(text)) return 'Email không hợp lệ';
    if (field.kind === 'phone' && !PHONE_PATTERN.test(text))
      return 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0';
    if (field.kind === 'daymonth' && !isValidDayMonth(text)) return 'Ngày và tháng không hợp lệ';
    if (field.kind === 'date') {
      const max = field.maxDate === 'today' ? today : field.maxDate;
      if (max && text > max)
        return field.maxDate === 'today'
          ? 'Ngày không được sau hôm nay'
          : 'Ngày vượt quá giới hạn cho phép';
      if (field.minDate && text < field.minDate) return 'Ngày sớm hơn giới hạn cho phép';
    }
  }
  return field.validate ? field.validate(value, values, mode) : null;
}

/** Kiểm tra cả form; chỉ trả các trường có lỗi. */
export function validateForm(
  form: FormDefinition,
  values: FormValues,
  mode: FormMode,
  today = todayIso(),
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of form.fields) {
    const error = validateField(field, values, mode, today);
    if (error) errors[field.name] = error;
  }
  return errors;
}

/** Cắt khoảng trắng chuỗi, giữ boolean; dùng trong toBody của các định nghĩa. */
export function trimmed(values: FormValues, name: string): string {
  const value = values[name];
  return typeof value === 'string' ? value.trim() : '';
}

/** Chuỗi rỗng -> undefined để không gửi lên BE (BE bỏ qua trường vắng). */
export function optional(values: FormValues, name: string): string | undefined {
  const text = trimmed(values, name);
  return text === '' ? undefined : text;
}

/**
 * Áp một thay đổi vào giá trị form và xóa các trường phụ thuộc (`resets`),
 * ví dụ đổi giáo hạt thì giáo xứ đã chọn không còn đúng.
 */
export function applyChange(
  form: FormDefinition,
  values: FormValues,
  name: string,
  next: string | boolean,
): FormValues {
  const field = form.fields.find((f) => f.name === name);
  const result: FormValues = { ...values, [name]: next };
  for (const reset of field?.resets ?? []) {
    const target = form.fields.find((f) => f.name === reset);
    result[reset] = target?.kind === 'switch' ? false : '';
  }
  return result;
}
