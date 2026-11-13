import { passwordStrength } from '@/core/domain/password-rules';

import { changePasswordSchema, loginSchema, otpSchema } from './forms';

describe('form schemas (thông báo tiếng Việt)', () => {
  it('loginSchema: bắt buộc tài khoản và mật khẩu', () => {
    const result = loginSchema.safeParse({ username: '  ', password: '', rememberMe: true });
    expect(result.success).toBe(false);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);
    expect(messages).toEqual(expect.arrayContaining(['Nhập tài khoản', 'Nhập mật khẩu']));
  });

  it('changePasswordSchema: mới ≠ cũ và nhập lại khớp', () => {
    const base = { oldPassword: 'Abcdef12', newPassword: 'Abcdef12', confirmPassword: 'Abcdef12' };
    const same = changePasswordSchema.safeParse(base);
    expect(same.success ? '' : same.error.issues[0]?.message).toBe(
      'Mật khẩu mới phải khác mật khẩu cũ',
    );
    const mismatch = changePasswordSchema.safeParse({
      ...base,
      newPassword: 'Abcdef13',
      confirmPassword: 'x',
    });
    expect(mismatch.success ? '' : mismatch.error.issues[0]?.message).toBe(
      'Mật khẩu nhập lại không khớp',
    );
    expect(
      changePasswordSchema.safeParse({
        ...base,
        newPassword: 'Abcdef13',
        confirmPassword: 'Abcdef13',
      }).success,
    ).toBe(true);
  });

  it('otpSchema: đúng 6 chữ số', () => {
    expect(otpSchema.safeParse({ otp: '123456' }).success).toBe(true);
    expect(otpSchema.safeParse({ otp: '12345' }).success).toBe(false);
    expect(otpSchema.safeParse({ otp: '12a456' }).success).toBe(false);
  });
});

describe('passwordStrength', () => {
  it('yếu / trung bình / mạnh theo FE', () => {
    expect(passwordStrength('abc').level).toBe(1);
    expect(passwordStrength('abcdefgh1').level).toBe(1); // chỉ 2 gợi ý (thường + số)
    expect(passwordStrength('Abcdefgh1').level).toBe(2); // thiếu ký tự đặc biệt
    expect(passwordStrength('Abcdefg1!').level).toBe(3);
  });
});
