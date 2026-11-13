import type { SessionTokens } from '@/core/auth/session';

import type {
  AuthUser,
  CaptchaConfig,
  OtpChallenge,
  PrivacyConsentStatus,
} from '../domain/entities';

import type {
  AuthUserDto,
  CaptchaConfigDto,
  MobileTokenDto,
  OtpChallengeDto,
  PrivacyConsentDto,
} from './auth-dto';

export function toAuthUser(dto: AuthUserDto): AuthUser {
  return {
    username: dto.username,
    leaderId: dto.leaderId ?? null,
    dioceseId: dto.dioceseId ?? null,
    deaneryId: dto.deaneryId ?? null,
    parishId: dto.parishId ?? null,
    roles: dto.roles ?? [],
    permissions: dto.permissions ?? [],
    mustChangePassword: dto.mustChangePassword ?? false,
    unitLocked: dto.unitLocked ?? false,
  };
}

/** Thời hạn BE trả là số mili-giây còn lại; đổi sang mốc tuyệt đối theo đồng hồ máy. */
export function toSessionTokens(dto: MobileTokenDto, now: number): SessionTokens {
  return {
    accessToken: dto.accessToken,
    refreshToken: dto.refreshToken,
    accessTokenExpiresAt: now + dto.accessTokenExpiresInMs,
    refreshTokenExpiresAt: now + dto.refreshTokenExpiresInMs,
  };
}

export function toCaptchaConfig(dto: CaptchaConfigDto): CaptchaConfig {
  const siteKey = dto.siteKey || null;
  return { enabled: Boolean(dto.enabled && siteKey), siteKey };
}

export function toOtpChallenge(dto: OtpChallengeDto): OtpChallenge {
  return {
    maskedEmail: dto.maskedEmail ?? dto.email ?? '',
    expiresInSeconds: dto.expiresInSeconds,
    resendAfterSeconds: dto.resendAfterSeconds,
  };
}

export function toPrivacyConsent(dto: PrivacyConsentDto): PrivacyConsentStatus {
  return {
    policyVersion: dto.policyVersion,
    consented: dto.consented,
    consentedVersion: dto.consentedVersion ?? null,
    consentedAt: dto.consentedAt ?? null,
  };
}
