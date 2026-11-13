/** Quy tắc mật khẩu của BE: 8–72 ký tự. Các gợi ý mạnh/yếu chỉ để người dùng tham khảo (port từ FE password-strength.ts). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export const strongPasswordHints = [
  { id: 'upper', label: 'Có chữ hoa (A–Z)', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'Có chữ thường (a–z)', test: (value: string) => /[a-z]/.test(value) },
  { id: 'digit', label: 'Có chữ số (0–9)', test: (value: string) => /\d/.test(value) },
  {
    id: 'special',
    label: 'Có ký tự đặc biệt (!@#$%…)',
    test: (value: string) => /[^A-Za-z0-9\s]/.test(value),
  },
  { id: 'long', label: 'Dài từ 12 ký tự trở lên', test: (value: string) => value.length >= 12 },
] as const;

export type PasswordStrengthLevel = 1 | 2 | 3;

export interface PasswordStrength {
  level: PasswordStrengthLevel;
  label: 'Yếu' | 'Trung bình' | 'Mạnh';
}

/** Yếu: dưới 8 ký tự hoặc đạt ≤ 2 gợi ý; Trung bình: thiếu một loại ký tự; Mạnh: đủ hoa, thường, số, đặc biệt. */
export function passwordStrength(value: string): PasswordStrength {
  const met = strongPasswordHints.filter((hint) => hint.test(value)).map((hint) => hint.id);
  const hasAllKinds = (['upper', 'lower', 'digit', 'special'] as const).every((id) =>
    met.includes(id),
  );
  if (value.length < PASSWORD_MIN_LENGTH || met.length <= 2) return { level: 1, label: 'Yếu' };
  if (!hasAllKinds) return { level: 2, label: 'Trung bình' };
  return { level: 3, label: 'Mạnh' };
}
