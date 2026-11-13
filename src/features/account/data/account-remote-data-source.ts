import type { HttpClient } from '@/core/network/http-client';

import type { MyProfileDto, PasswordOtpDto, PermissionPageDto } from './account-dto';

export class AccountRemoteDataSource {
  constructor(private readonly http: HttpClient) {}

  profile(): Promise<MyProfileDto> {
    return this.http.request({ method: 'GET', path: '/auth/me/profile' });
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

  permissions(page: number, size: number, search?: string): Promise<PermissionPageDto> {
    return this.http.request({
      method: 'GET',
      path: '/auth/me/permissions',
      query: { page, size, search },
    });
  }
}
