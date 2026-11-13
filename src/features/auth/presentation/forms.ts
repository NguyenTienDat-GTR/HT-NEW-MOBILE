import { z } from 'zod';

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../domain/password-rules';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Nhập tài khoản'),
  password: z.string().min(1, 'Nhập mật khẩu'),
  // Mobile không có cookie; ghi nhớ = phiên lâu hơn ở BE (7 ngày không hoạt động, tối đa 30 ngày).
  rememberMe: z.boolean(),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Mật khẩu mới tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`)
  .max(PASSWORD_MAX_LENGTH, `Mật khẩu mới tối đa ${PASSWORD_MAX_LENGTH} ký tự`);

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
    newPassword,
    confirmPassword: z.string().min(1, 'Nhập lại mật khẩu mới'),
  })
  .refine((value) => value.oldPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'Mật khẩu mới phải khác mật khẩu cũ',
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const usernameSchema = z.object({
  username: z.string().trim().min(1, 'Nhập tên đăng nhập'),
});
export const otpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Mã OTP gồm 6 chữ số'),
});
export const newPasswordSchema = z
  .object({ newPassword, confirmPassword: z.string().min(1, 'Nhập lại mật khẩu mới') })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  });
