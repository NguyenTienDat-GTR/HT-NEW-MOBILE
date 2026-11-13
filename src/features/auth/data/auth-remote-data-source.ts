import type { HttpClient } from '@/core/network/http-client';

import type {
  AuthUserDto,
  CaptchaConfigDto,
  LoginRequestDto,
  MobileTokenDto,
  OtpChallengeDto,
  PrivacyConsentDto,
} from './auth-dto';

/**
 * Các lời gọi API xác thực. Endpoint đăng nhập/làm mới/đăng xuất của mobile nằm riêng ở /mobile/auth/*
 * (không dùng /auth/* của web vì web chỉ phát token qua cookie HttpOnly).
 */
export class AuthRemoteDataSource {
  constructor(private readonly http: HttpClient) {}

  captchaConfig(): Promise<CaptchaConfigDto> {
    return this.http.request({ method: 'GET', path: '/auth/captcha-config', auth: false });
  }

  login(body: LoginRequestDto): Promise<MobileTokenDto> {
    return this.http.request({ method: 'POST', path: '/mobile/auth/login', body, auth: false });
  }

  refresh(refreshToken: string): Promise<MobileTokenDto> {
    return this.http.request({
      method: 'POST',
      path: '/mobile/auth/refresh',
      body: { refreshToken },
      auth: false,
    });
  }

  logout(refreshToken: string, accessToken: string): Promise<void> {
    return this.http.request({
      method: 'POST',
      path: '/mobile/auth/logout',
      body: { refreshToken, accessToken },
      auth: false,
    });
  }

  me(): Promise<AuthUserDto> {
    return this.http.request({ method: 'GET', path: '/auth/me' });
  }

  changePassword(oldPassword: string, newPassword: string): Promise<void> {
    return this.http.request({
      method: 'POST',
      path: '/auth/change-password',
      body: { oldPassword, newPassword },
    });
  }

  sendPasswordResetOtp(username: string): Promise<OtpChallengeDto> {
    return this.http.request({
      method: 'POST',
      path: '/auth/forgot-password/otp',
      body: { username },
      auth: false,
    });
  }

  verifyPasswordResetOtp(username: string, otp: string): Promise<{ resetToken: string }> {
    return this.http.request({
      method: 'POST',
      path: '/auth/forgot-password/otp/verify',
      body: { username, otp },
      auth: false,
    });
  }

  resetPassword(body: {
    username: string;
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> {
    return this.http.request({
      method: 'POST',
      path: '/auth/forgot-password/reset',
      body,
      auth: false,
    });
  }

  privacyConsent(): Promise<PrivacyConsentDto> {
    return this.http.request({ method: 'GET', path: '/auth/me/privacy-consent' });
  }

  acceptPrivacyConsent(): Promise<PrivacyConsentDto> {
    return this.http.request({
      method: 'POST',
      path: '/auth/me/privacy-consent',
      body: { privacyConsent: true },
    });
  }
}
