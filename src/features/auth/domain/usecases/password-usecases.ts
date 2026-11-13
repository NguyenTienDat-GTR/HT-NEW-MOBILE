import { AppError } from '@/core/domain/app-error';

import type { OtpChallenge } from '../entities';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/core/domain/password-rules';
import type { AuthRepository } from '../repositories/auth-repository';

function assertValidNewPassword(newPassword: string, confirmPassword?: string): void {
  if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH) {
    throw new AppError(
      'validation',
      `Mật khẩu mới từ ${PASSWORD_MIN_LENGTH} đến ${PASSWORD_MAX_LENGTH} ký tự`,
    );
  }
  if (confirmPassword !== undefined && confirmPassword !== newPassword) {
    throw new AppError('validation', 'Mật khẩu nhập lại không khớp');
  }
}

export class ChangeTemporaryPassword {
  constructor(private readonly repository: AuthRepository) {}

  async execute(oldPassword: string, newPassword: string): Promise<void> {
    assertValidNewPassword(newPassword);
    if (oldPassword === newPassword) {
      throw new AppError('validation', 'Mật khẩu mới phải khác mật khẩu cũ');
    }
    await this.repository.changePassword(oldPassword, newPassword);
  }
}

export class RequestPasswordResetOtp {
  constructor(private readonly repository: AuthRepository) {}

  execute(username: string): Promise<OtpChallenge> {
    return this.repository.sendPasswordResetOtp(username.trim());
  }
}

export class VerifyPasswordResetOtp {
  constructor(private readonly repository: AuthRepository) {}

  /** Trả về resetToken dùng cho bước đặt mật khẩu mới. */
  execute(username: string, otp: string): Promise<string> {
    return this.repository.verifyPasswordResetOtp(username.trim(), otp.trim());
  }
}

export class ResetPassword {
  constructor(private readonly repository: AuthRepository) {}

  async execute(input: {
    username: string;
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> {
    assertValidNewPassword(input.newPassword, input.confirmPassword);
    await this.repository.resetPassword({ ...input, username: input.username.trim() });
  }
}
