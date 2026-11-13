/**
 * Hình dạng dữ liệu BE trả về. Chỉ lớp data biết các kiểu này; mapper đổi sang entity của domain.
 */
export interface AuthUserDto {
  username: string;
  leaderId?: string | null;
  dioceseId?: string | null;
  deaneryId?: string | null;
  parishId?: string | null;
  roles?: string[] | null;
  permissions?: string[] | null;
  mustChangePassword?: boolean | null;
  unitLocked?: boolean | null;
}

/** Response của /api/mobile/auth/login và /refresh (khác web: có refreshToken trong thân). */
export interface MobileTokenDto {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  accessTokenExpiresInMs: number;
  refreshTokenExpiresInMs: number;
  rememberMe?: boolean;
  user?: AuthUserDto | null;
}

export interface CaptchaConfigDto {
  enabled?: boolean | null;
  siteKey?: string | null;
}

export interface OtpChallengeDto {
  maskedEmail?: string | null;
  /** /auth/password/otp trả `email`, quên mật khẩu trả `maskedEmail`. */
  email?: string | null;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface PrivacyConsentDto {
  policyVersion: string;
  consented: boolean;
  consentedVersion?: string | null;
  consentedAt?: string | null;
}

export interface LoginRequestDto {
  username: string;
  password: string;
  rememberMe: boolean;
  deviceId: string;
  turnstileToken?: string;
}
