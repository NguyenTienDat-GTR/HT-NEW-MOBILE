import type { Page } from '@/core/domain/page';

import type {
  MyPermission,
  MyPermissionFilterOptions,
  MyPermissionFilters,
  MyProfile,
  PasswordOtpChallenge,
} from './entities';

import type { ProfileChanges } from './profile-edit';

/** Tệp ảnh đã chọn và cắt sẵn trên máy (đường dẫn cục bộ). */
export interface AvatarFile {
  uri: string;
  name: string;
  type: string;
}

export interface AccountRepository {
  /** Tải ảnh lên (/media, loại ACCOUNT_AVATAR) rồi đặt làm ảnh đại diện (PUT /auth/me/avatar). */
  changeAvatar(file: AvatarFile): Promise<void>;
  getProfile(): Promise<MyProfile>;
  /** Tự sửa hồ sơ cá nhân (PUT /auth/me/profile); đồng ý xử lý dữ liệu đã được xác nhận ở màn hình. */
  updateMyProfile(changes: ProfileChanges): Promise<void>;
  changeEmail(email: string, currentPassword: string): Promise<void>;
  requestPasswordChangeOtp(oldPassword: string): Promise<PasswordOtpChallenge>;
  verifyPasswordChangeOtp(otp: string): Promise<string>;
  changePassword(changeToken: string, newPassword: string, confirmPassword: string): Promise<void>;
  listMyPermissions(
    page: number,
    size: number,
    search?: string,
    filters?: MyPermissionFilters,
  ): Promise<Page<MyPermission>>;
  myPermissionFilterOptions(): Promise<MyPermissionFilterOptions>;
}
