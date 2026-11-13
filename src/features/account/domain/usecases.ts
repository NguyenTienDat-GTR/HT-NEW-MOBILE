import { AppError } from '@/core/domain/app-error';
import type { Page } from '@/core/domain/page';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/core/domain/password-rules';

import type { MyPermission, MyProfile, PasswordOtpChallenge } from './entities';
import type { AccountRepository } from './repository';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class GetMyProfile {
  constructor(private readonly repository: AccountRepository) {}

  execute(): Promise<MyProfile> {
    return this.repository.getProfile();
  }
}

export class ChangeMyEmail {
  constructor(private readonly repository: AccountRepository) {}

  async execute(email: string, currentPassword: string): Promise<void> {
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) throw new AppError('validation', 'Email không hợp lệ');
    if (!currentPassword) throw new AppError('validation', 'Nhập mật khẩu hiện tại để xác nhận');
    await this.repository.changeEmail(trimmed, currentPassword);
  }
}

/** Bước 1 đổi mật khẩu: xác nhận mật khẩu cũ, BE gửi mã OTP tới email của tài khoản. */
export class RequestPasswordChangeOtp {
  constructor(private readonly repository: AccountRepository) {}

  execute(oldPassword: string): Promise<PasswordOtpChallenge> {
    return this.repository.requestPasswordChangeOtp(oldPassword);
  }
}

/** Bước 2: nhập OTP, nhận changeToken dùng cho bước 3. */
export class VerifyPasswordChangeOtp {
  constructor(private readonly repository: AccountRepository) {}

  execute(otp: string): Promise<string> {
    return this.repository.verifyPasswordChangeOtp(otp.trim());
  }
}

/** Bước 3: đặt mật khẩu mới. BE giữ phiên hiện tại (khác đổi mật khẩu tạm: thu hồi mọi phiên). */
export class ChangePasswordWithToken {
  constructor(private readonly repository: AccountRepository) {}

  async execute(changeToken: string, newPassword: string, confirmPassword: string): Promise<void> {
    if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH) {
      throw new AppError(
        'validation',
        `Mật khẩu mới từ ${PASSWORD_MIN_LENGTH} đến ${PASSWORD_MAX_LENGTH} ký tự`,
      );
    }
    if (newPassword !== confirmPassword) {
      throw new AppError('validation', 'Mật khẩu nhập lại không khớp');
    }
    await this.repository.changePassword(changeToken, newPassword, confirmPassword);
  }
}

export class ListMyPermissions {
  constructor(private readonly repository: AccountRepository) {}

  execute(page: number, size: number, search?: string): Promise<Page<MyPermission>> {
    return this.repository.listMyPermissions(page, size, search?.trim() || undefined);
  }
}
