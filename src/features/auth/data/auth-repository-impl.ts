import type { TokenStore } from '@/core/auth/session';
import { AppError } from '@/core/domain/app-error';
import type { DeviceIdProvider } from '@/core/storage/device-id';

import type {
  AuthUser,
  CaptchaConfig,
  LoginCredentials,
  OtpChallenge,
  PrivacyConsentStatus,
} from '../domain/entities';
import type { AuthRepository } from '../domain/repositories/auth-repository';

import {
  toAuthUser,
  toCaptchaConfig,
  toOtpChallenge,
  toPrivacyConsent,
  toSessionTokens,
} from './auth-mapper';
import type { AuthRemoteDataSource } from './auth-remote-data-source';

export class AuthRepositoryImpl implements AuthRepository {
  constructor(
    private readonly remote: AuthRemoteDataSource,
    private readonly tokens: TokenStore,
    private readonly deviceId: DeviceIdProvider,
    private readonly now: () => number = Date.now,
  ) {}

  async getCaptchaConfig(): Promise<CaptchaConfig> {
    return toCaptchaConfig(await this.remote.captchaConfig());
  }

  async login(credentials: LoginCredentials): Promise<AuthUser> {
    const dto = await this.remote.login({
      username: credentials.username,
      password: credentials.password,
      rememberMe: credentials.rememberMe,
      deviceId: await this.deviceId.get(),
      ...(credentials.turnstileToken ? { turnstileToken: credentials.turnstileToken } : {}),
    });
    await this.tokens.save(toSessionTokens(dto, this.now()));
    if (dto.user) return toAuthUser(dto.user);
    return this.fetchCurrentUser();
  }

  async restoreSession(): Promise<AuthUser | null> {
    if (!(await this.tokens.load())) return null;
    try {
      return await this.fetchCurrentUser();
    } catch (error) {
      // Phiên đã bị từ chối: coordinator đã xóa token và phát sự kiện, coi như chưa đăng nhập.
      if (error instanceof AppError && error.kind === 'unauthorized') return null;
      throw error;
    }
  }

  async fetchCurrentUser(): Promise<AuthUser> {
    return toAuthUser(await this.remote.me());
  }

  async logout(): Promise<void> {
    const current = await this.tokens.load();
    if (current) {
      try {
        await this.remote.logout(current.refreshToken, current.accessToken);
      } catch {
        // Mất mạng hay phiên đã hết hạn thì vẫn đăng xuất cục bộ.
      }
    }
    await this.tokens.clear();
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await this.remote.changePassword(oldPassword, newPassword);
    await this.tokens.clear();
  }

  async sendPasswordResetOtp(username: string): Promise<OtpChallenge> {
    return toOtpChallenge(await this.remote.sendPasswordResetOtp(username));
  }

  async verifyPasswordResetOtp(username: string, otp: string): Promise<string> {
    return (await this.remote.verifyPasswordResetOtp(username, otp)).resetToken;
  }

  resetPassword(input: {
    username: string;
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> {
    return this.remote.resetPassword(input);
  }

  async getPrivacyConsent(): Promise<PrivacyConsentStatus> {
    return toPrivacyConsent(await this.remote.privacyConsent());
  }

  async acceptPrivacyConsent(): Promise<PrivacyConsentStatus> {
    return toPrivacyConsent(await this.remote.acceptPrivacyConsent());
  }
}
