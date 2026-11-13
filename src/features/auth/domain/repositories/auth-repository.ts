import type {
  AuthUser,
  CaptchaConfig,
  LoginCredentials,
  OtpChallenge,
  PrivacyConsentStatus,
} from '../entities';

/** Cổng truy cập dữ liệu xác thực. Cài đặt nằm ở lớp data; use case chỉ biết interface này. */
export interface AuthRepository {
  getCaptchaConfig(): Promise<CaptchaConfig>;
  /** Đăng nhập và lưu phiên. */
  login(credentials: LoginCredentials): Promise<AuthUser>;
  /** Khôi phục phiên đã lưu; null nếu chưa có phiên. Ném lỗi mạng để UI cho thử lại. */
  restoreSession(): Promise<AuthUser | null>;
  fetchCurrentUser(): Promise<AuthUser>;
  /** Đăng xuất: hủy phiên ở BE (không ném lỗi nếu mất mạng) và xóa token cục bộ. */
  logout(): Promise<void>;

  /** Đổi mật khẩu tạm. BE thu hồi mọi phiên sau khi đổi nên phiên cục bộ cũng bị xóa. */
  changePassword(oldPassword: string, newPassword: string): Promise<void>;
  sendPasswordResetOtp(username: string): Promise<OtpChallenge>;
  verifyPasswordResetOtp(username: string, otp: string): Promise<string>;
  resetPassword(input: {
    username: string;
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void>;

  getPrivacyConsent(): Promise<PrivacyConsentStatus>;
  acceptPrivacyConsent(): Promise<PrivacyConsentStatus>;
}
