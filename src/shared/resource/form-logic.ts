import type { FormDefinition, FormFieldDef, FormMode, FormValues } from './types';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Số điện thoại VN: 10 chữ số, bắt đầu bằng 0 (giống FE edit-profile-dialog). */
export const PHONE_PATTERN = /^0\d{9}$/;

const pad = (n: number) => String(n).padStart(2, '0');

export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Đọc giá trị của ô `multiselect` (chuỗi JSON mảng) thành mảng chuỗi; sai dạng thì coi như rỗng. */
export function parseMulti(value: string | boolean | undefined): string[] {
  if (typeof value !== 'string' || value.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export const stringifyMulti = (items: readonly string[]): string => JSON.stringify(items);

/** Ô có bắt buộc ở chế độ hiện tại không (dấu * và kiểm tra bắt buộc dùng chung hàm này). */
export const isRequired = (field: FormFieldDef, mode: FormMode): boolean =>
  Boolean(field.required) && !(field.requiredOnCreateOnly && mode === 'edit');

/** Ô có giá trị đúng/sai (công tắc, ô đồng ý). */
export const isBooleanField = (field: FormFieldDef | undefined): boolean =>
  field?.kind === 'switch' || field?.kind === 'consent';

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

/** Ô ngắn (ngày, số) có thể xếp cặp hai cột; khai báo `width` thì theo khai báo. */
export function isCompactField(field: FormFieldDef): boolean {
  if (field.width) return field.width === 'half';
  if (field.kind === 'date') return true;
  return (
    field.kind === 'text' &&
    (field.keyboardType === 'number-pad' || field.keyboardType === 'decimal-pad')
  );
}

/**
 * Chia các ô đang hiện thành hàng: hai ô ngắn liền nhau chung một hàng; ô còn lại một hàng riêng (ô ngắn lẻ được
 * vẽ nửa chiều rộng, không kéo dài hết dòng).
 */
export function groupFormRows(fields: readonly FormFieldDef[]): FormFieldDef[][] {
  const rows: FormFieldDef[][] = [];
  let index = 0;
  while (index < fields.length) {
    const current = fields[index] as FormFieldDef;
    const next = fields[index + 1];
    if (next && isCompactField(current) && isCompactField(next)) {
      rows.push([current, next]);
      index += 2;
    } else {
      rows.push([current]);
      index += 1;
    }
  }
  return rows;
}

export function isFieldVisible(field: FormFieldDef, values: FormValues, mode: FormMode): boolean {
  return field.visible ? field.visible(values, mode) : true;
}

/** Các ô của một nhóm đang hiện, theo thứ tự khai báo trong nhóm (tên không có trong form bị bỏ). */
export function visibleFields(
  form: FormDefinition,
  names: readonly string[],
  values: FormValues,
  mode: FormMode,
): FormFieldDef[] {
  return names
    .map((name) => form.fields.find((field) => field.name === name))
    .filter((field): field is FormFieldDef => !!field && isFieldVisible(field, values, mode));
}

/** Kiểm tra một trường: bắt buộc, định dạng theo kiểu, giới hạn ngày, rồi validate riêng. Trả lỗi tiếng Việt hoặc null. */
export function validateField(
  field: FormFieldDef,
  values: FormValues,
  mode: FormMode,
  today = todayIso(),
): string | null {
  if (!isFieldVisible(field, values, mode)) return null;
  const value = values[field.name] ?? (isBooleanField(field) ? false : '');
  if (!isBooleanField(field) && isRequired(field, mode) && isEmpty(value)) {
    return field.kind === 'select' ||
      field.kind === 'date' ||
      field.kind === 'datetime' ||
      field.kind === 'lookup'
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

export interface FirstFormError {
  name: string;
  /** Chỉ số nhóm (section) chứa ô lỗi. */
  sectionIndex: number;
}

/** Ô lỗi đầu tiên theo thứ tự hiển thị của form (nhóm trước, trong nhóm theo thứ tự ô); không có lỗi -> null. */
export function firstFormError(
  form: FormDefinition,
  errors: Record<string, string>,
): FirstFormError | null {
  for (const [sectionIndex, section] of form.sections.entries()) {
    const name = section.fields.find((fieldName) => errors[fieldName]);
    if (name) return { name, sectionIndex };
  }
  return null;
}

/** Số ô lỗi của từng nhóm (theo chỉ số nhóm) để hiện nhãn lỗi trên tiêu đề nhóm đã thu gọn. */
export function sectionErrorCounts(form: FormDefinition, errors: Record<string, string>): number[] {
  return form.sections.map(
    (section) => section.fields.filter((fieldName) => errors[fieldName]).length,
  );
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
    result[reset] = isBooleanField(target) ? false : '';
  }
  return result;
}
