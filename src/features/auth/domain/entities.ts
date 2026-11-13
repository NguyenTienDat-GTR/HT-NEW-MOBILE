import type { PermissionSubject } from '@/core/domain/permissions';

/** Người dùng đang đăng nhập (GET /auth/me). Quyền xét theo mã permission, không theo role. */
export interface AuthUser extends PermissionSubject {
  username: string;
  leaderId: string | null;
  dioceseId: string | null;
  deaneryId: string | null;
  parishId: string | null;
  /** Mật khẩu tạm do quản trị đặt: phải đổi trước khi dùng. */
  mustChangePassword: boolean;
  /** Đơn vị của tài khoản bị khóa: chỉ còn xem thông báo. */
  unitLocked: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
  turnstileToken?: string;
}

/** Cấu hình xác minh Cloudflare Turnstile ở màn đăng nhập. */
export interface CaptchaConfig {
  enabled: boolean;
  siteKey: string | null;
}

/** Kết quả gửi mã OTP qua email (đổi hoặc quên mật khẩu). */
export interface OtpChallenge {
  maskedEmail: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface PrivacyConsentStatus {
  policyVersion: string;
  consented: boolean;
  consentedVersion: string | null;
  consentedAt: string | null;
}
