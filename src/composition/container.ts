import { Platform } from 'react-native';

import { StorageTokenStore } from '@/core/auth/secure-token-store';
import { SessionCoordinator } from '@/core/auth/session-coordinator';
import { SessionEvents } from '@/core/auth/session';
import { readEnv, type AppEnv } from '@/core/config/env';
import { AuthenticatedHttpClient } from '@/core/network/authenticated-http-client';
import { FetchHttpClient } from '@/core/network/fetch-http-client';
import type { HttpClient } from '@/core/network/http-client';
import { StoredDeviceIdProvider } from '@/core/storage/device-id';
import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import { SecureKeyValueStorage } from '@/core/storage/secure-key-value-storage';
import { WebKeyValueStorage } from '@/core/storage/web-key-value-storage';
import { AuthRemoteDataSource } from '@/features/auth/data/auth-remote-data-source';
import { AuthRepositoryImpl } from '@/features/auth/data/auth-repository-impl';
import { MobileTokenRefresher } from '@/features/auth/data/mobile-token-refresher';
import {
  ChangeTemporaryPassword,
  RequestPasswordResetOtp,
  ResetPassword,
  VerifyPasswordResetOtp,
} from '@/features/auth/domain/usecases/password-usecases';
import {
  AcceptPrivacyConsent,
  GetPrivacyConsent,
} from '@/features/auth/domain/usecases/privacy-usecases';
import {
  GetCaptchaConfig,
  Login,
  Logout,
  RestoreSession,
} from '@/features/auth/domain/usecases/session-usecases';
import type { AuthDependencies } from '@/features/auth/presentation/auth-context';

export interface AppContainer {
  env: AppEnv;
  /** Client đã gắn Bearer và tự làm mới phiên: các tính năng khác dùng client này. */
  http: HttpClient;
  auth: AuthDependencies;
}

/**
 * Composition root: nơi duy nhất biết lớp cụ thể nào được nối với interface nào.
 * Không dùng service locator toàn cục: mỗi tính năng nhận đúng phần phụ thuộc của mình qua Provider.
 */
export function createAppContainer(env: AppEnv = readEnv()): AppContainer {
  // Web chỉ để xem thử giao diện khi phát triển (expo-secure-store không có trên web).
  const storage: KeyValueStorage =
    Platform.OS === 'web' ? new WebKeyValueStorage() : new SecureKeyValueStorage();
  const tokenStore = new StorageTokenStore(storage);
  const deviceId = new StoredDeviceIdProvider(storage);
  const sessionEvents = new SessionEvents();

  // Client thô dùng cho refresh để tránh vòng phụ thuộc (refresh không được đi qua chính bộ làm mới phiên).
  const rawHttp = new FetchHttpClient({ baseUrl: env.apiBaseUrl, timeoutMs: env.requestTimeoutMs });
  const refresher = new MobileTokenRefresher(new AuthRemoteDataSource(rawHttp));
  const session = new SessionCoordinator(tokenStore, refresher, sessionEvents);
  const http = new AuthenticatedHttpClient(rawHttp, session);

  const authRepository = new AuthRepositoryImpl(
    new AuthRemoteDataSource(http),
    tokenStore,
    deviceId,
  );

  return {
    env,
    http,
    auth: {
      getCaptchaConfig: new GetCaptchaConfig(authRepository),
      login: new Login(authRepository),
      logout: new Logout(authRepository),
      restoreSession: new RestoreSession(authRepository),
      changeTemporaryPassword: new ChangeTemporaryPassword(authRepository),
      requestPasswordResetOtp: new RequestPasswordResetOtp(authRepository),
      verifyPasswordResetOtp: new VerifyPasswordResetOtp(authRepository),
      resetPassword: new ResetPassword(authRepository),
      getPrivacyConsent: new GetPrivacyConsent(authRepository),
      acceptPrivacyConsent: new AcceptPrivacyConsent(authRepository),
      sessionEvents,
      siteOrigin: env.siteOrigin,
    },
  };
}
