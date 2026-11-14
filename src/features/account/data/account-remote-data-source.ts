import type { HttpClient } from '@/core/network/http-client';

import type { MyProfileDto, PasswordOtpDto, PermissionPageDto } from './account-dto';

export class AccountRemoteDataSource {
  constructor(private readonly http: HttpClient) {}

  profile(): Promise<MyProfileDto> {
    return this.http.request({ method: 'GET', path: '/auth/me/profile' });
  }

  /** Tải ảnh lên kho ảnh của BE (multipart `file` + `category`). */
  uploadAvatar(file: { uri: string; name: string; type: string }): Promise<{ assetId: string }> {
    const body = new FormData();
    // React Native nhận tệp cục bộ dạng { uri, name, type }.
    body.append('file', file as unknown as Blob);
    body.append('category', 'ACCOUNT_AVATAR');
    return this.http.request({ method: 'POST', path: '/media', body });
  }

  setAvatar(imageAssetId: string): Promise<unknown> {
    return this.http.request({
      method: 'PUT',
      path: '/auth/me/avatar',
      body: { imageAssetId, privacyConsent: true },
    });
  }

  updateProfile(body: Record<string, unknown>): Promise<unknown> {
    // BE bắt buộc cờ đồng ý xử lý dữ liệu khi sửa hồ sơ; người dùng đã tích đồng ý ở màn sửa hồ sơ.
    return this.http.request({
      method: 'PUT',
      path: '/auth/me/profile',
      body: { ...body, privacyConsent: true },
    });
  }

  changeEmail(email: string, currentPassword: string): Promise<{ email: string }> {
    // BE bắt buộc cờ đồng ý xử lý dữ liệu khi đổi email; người dùng đã đồng ý chính sách ở cổng sau đăng nhập.
    return this.http.request({
      method: 'PUT',
      path: '/auth/me/email',
      body: { email, currentPassword, privacyConsent: true },
    });
  }

  sendPasswordOtp(oldPassword: string): Promise<PasswordOtpDto> {
    return this.http.request({ method: 'POST', path: '/auth/password/otp', body: { oldPassword } });
  }

  verifyPasswordOtp(otp: string): Promise<{ changeToken: string }> {
    return this.http.request({ method: 'POST', path: '/auth/password/otp/verify', body: { otp } });
  }

  changePassword(changeToken: string, newPassword: string, confirmPassword: string): Promise<void> {
    return this.http.request({
      method: 'POST',
      path: '/auth/password/change',
      body: { changeToken, newPassword, confirmPassword },
    });
  }

  permissions(
    page: number,
    size: number,
    search?: string,
    filters?: Record<string, string>,
  ): Promise<PermissionPageDto> {
    return this.http.request({
      method: 'GET',
      path: '/auth/me/permissions',
      // BE gọi Set.of(...).contains(sortBy) nên thiếu sortBy là lỗi 500; web luôn gửi sắp xếp, app cũng phải gửi.
      query: {
        page,
        size,
        search,
        sortBy: 'permissionName',
        sortDirection: 'ASC',
        filters: filters && Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined,
      },
    });
  }

  permissionFilterOptions(): Promise<{ modules?: string[] | null; actions?: string[] | null }> {
    return this.http.request({ method: 'GET', path: '/auth/me/permissions/filter-options' });
  }
}
