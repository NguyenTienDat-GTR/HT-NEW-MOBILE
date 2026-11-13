import type { Page } from '@/core/domain/page';

import type { MyPermission, MyProfile, PasswordOtpChallenge } from './entities';

export interface AccountRepository {
  getProfile(): Promise<MyProfile>;
  changeEmail(email: string, currentPassword: string): Promise<void>;
  requestPasswordChangeOtp(oldPassword: string): Promise<PasswordOtpChallenge>;
  verifyPasswordChangeOtp(otp: string): Promise<string>;
  changePassword(changeToken: string, newPassword: string, confirmPassword: string): Promise<void>;
  listMyPermissions(page: number, size: number, search?: string): Promise<Page<MyPermission>>;
}
