import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { StorageTokenStore } from '@/core/auth/secure-token-store';
import { SessionEvents } from '@/core/auth/session';
import { SessionCoordinator } from '@/core/auth/session-coordinator';
import { readEnv, type AppEnv } from '@/core/config/env';
import { AuthenticatedHttpClient } from '@/core/network/authenticated-http-client';
import { FetchHttpClient } from '@/core/network/fetch-http-client';
import type { HttpClient } from '@/core/network/http-client';
import { HttpResourceGateway } from '@/core/resource/http-resource-gateway';
import type { ResourceGateway } from '@/core/resource/resource-gateway';
import { ExpoPushGateway } from '@/core/push/expo-push-gateway';
import { NoopPushGateway, type PushGateway } from '@/core/push/push-gateway';
import { NoopRealtimeClient, type RealtimeClient } from '@/core/realtime/realtime-client';
import { StompRealtimeClient } from '@/core/realtime/stomp-realtime-client';
import { StoredDeviceIdProvider } from '@/core/storage/device-id';
import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import { SecureKeyValueStorage } from '@/core/storage/secure-key-value-storage';
import { WebKeyValueStorage } from '@/core/storage/web-key-value-storage';
import { AccountRemoteDataSource } from '@/features/account/data/account-remote-data-source';
import { AccountRepositoryImpl } from '@/features/account/data/account-repository-impl';
import {
  ChangeMyEmail,
  ChangePasswordWithToken,
  GetMyProfile,
  ListMyPermissions,
  RequestPasswordChangeOtp,
  VerifyPasswordChangeOtp,
} from '@/features/account/domain/usecases';
import type { AccountDependencies } from '@/features/account/presentation/account-context';
import { AnalyticsRemoteDataSource } from '@/features/analytics/data/analytics-remote-data-source';
import { AnalyticsRepositoryImpl } from '@/features/analytics/data/analytics-repository-impl';
import {
  GetAnalyticsRecords,
  GetAnalyticsReport,
  GetAnalyticsScopes,
  GetFilterOptions,
  GetOpenCourses,
  GetWorkQueue,
} from '@/features/analytics/domain/usecases';
import type { AnalyticsDependencies } from '@/features/analytics/presentation/analytics-context';
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
  RefreshCurrentUser,
  RestoreSession,
} from '@/features/auth/domain/usecases/session-usecases';
import type { AuthDependencies } from '@/features/auth/presentation/auth-context';
import { NotificationRemoteDataSource } from '@/features/notifications/data/notification-remote-data-source';
import {
  NotificationRepositoryImpl,
  PushDeviceRepositoryImpl,
} from '@/features/notifications/data/notification-repository-impl';
import { StompNotificationStream } from '@/features/notifications/data/stomp-notification-stream';
import {
  GetUnreadNotificationCount,
  ListNotifications,
  MarkAllNotificationsRead,
  MarkNotificationRead,
  ObserveNotifications,
  RegisterPushDevice,
  SyncAppBadge,
  UnregisterPushDevice,
} from '@/features/notifications/domain/usecases';
import type { NotificationDependencies } from '@/features/notifications/presentation/notifications-context';

export interface AppContainer {
  env: AppEnv;
  /** Client đã gắn Bearer và tự làm mới phiên: các tính năng khác dùng client này. */
  http: HttpClient;
  realtime: RealtimeClient;
  auth: AuthDependencies;
  notifications: NotificationDependencies;
  account: AccountDependencies;
  analytics: AnalyticsDependencies;
  /** Cổng CRUD dùng chung cho các màn danh sách/chi tiết/form chạy theo cấu hình. */
  resource: ResourceGateway;
}

/**
 * Composition root: nơi duy nhất biết lớp cụ thể nào được nối với interface nào.
 * Không dùng service locator toàn cục: mỗi tính năng nhận đúng phần phụ thuộc của mình qua Provider.
 */
export function createAppContainer(env: AppEnv = readEnv()): AppContainer {
  const native = Platform.OS === 'ios' || Platform.OS === 'android';
  // Web chỉ để xem thử giao diện khi phát triển (expo-secure-store, push, STOMP chỉ dành cho máy thật).
  const storage: KeyValueStorage = native ? new SecureKeyValueStorage() : new WebKeyValueStorage();
  const tokenStore = new StorageTokenStore(storage);
  const deviceId = new StoredDeviceIdProvider(storage);
  const sessionEvents = new SessionEvents();

  // Client thô dùng cho refresh để tránh vòng phụ thuộc (refresh không được đi qua chính bộ làm mới phiên).
  const rawHttp = new FetchHttpClient({ baseUrl: env.apiBaseUrl, timeoutMs: env.requestTimeoutMs });
  const refresher = new MobileTokenRefresher(new AuthRemoteDataSource(rawHttp));
  const session = new SessionCoordinator(tokenStore, refresher, sessionEvents);
  const http = new AuthenticatedHttpClient(rawHttp, session);

  const realtime: RealtimeClient = native
    ? new StompRealtimeClient(env.wsUrl, () => session.getAccessToken())
    : new NoopRealtimeClient();
  const pushGateway: PushGateway = native ? new ExpoPushGateway() : new NoopPushGateway();

  // Thông báo
  const notificationRemote = new NotificationRemoteDataSource(http);
  const notificationRepository = new NotificationRepositoryImpl(notificationRemote);
  const pushDevices = new PushDeviceRepositoryImpl(notificationRemote);
  const unregisterPushDevice = new UnregisterPushDevice(pushDevices, deviceId);
  const appVersion = Constants.expoConfig?.version ?? '0';

  // Xác thực: trước khi đăng xuất hủy đăng ký push (token còn hiệu lực).
  const authRepository = new AuthRepositoryImpl(
    new AuthRemoteDataSource(http),
    tokenStore,
    deviceId,
  );

  // Tài khoản
  const accountRepository = new AccountRepositoryImpl(new AccountRemoteDataSource(http));

  // Phân tích
  const analyticsRepository = new AnalyticsRepositoryImpl(new AnalyticsRemoteDataSource(http));

  return {
    env,
    http,
    realtime,
    auth: {
      getCaptchaConfig: new GetCaptchaConfig(authRepository),
      login: new Login(authRepository),
      logout: new Logout(authRepository, [() => unregisterPushDevice.execute()]),
      restoreSession: new RestoreSession(authRepository),
      refreshCurrentUser: new RefreshCurrentUser(authRepository),
      changeTemporaryPassword: new ChangeTemporaryPassword(authRepository),
      requestPasswordResetOtp: new RequestPasswordResetOtp(authRepository),
      verifyPasswordResetOtp: new VerifyPasswordResetOtp(authRepository),
      resetPassword: new ResetPassword(authRepository),
      getPrivacyConsent: new GetPrivacyConsent(authRepository),
      acceptPrivacyConsent: new AcceptPrivacyConsent(authRepository),
      sessionEvents,
      siteOrigin: env.siteOrigin,
    },
    notifications: {
      listNotifications: new ListNotifications(notificationRepository),
      getUnreadCount: new GetUnreadNotificationCount(notificationRepository),
      markRead: new MarkNotificationRead(notificationRepository),
      markAllRead: new MarkAllNotificationsRead(notificationRepository),
      observeNotifications: new ObserveNotifications(new StompNotificationStream(realtime)),
      registerPushDevice: new RegisterPushDevice(pushGateway, pushDevices, deviceId, appVersion),
      syncAppBadge: new SyncAppBadge(pushGateway),
    },
    account: {
      getMyProfile: new GetMyProfile(accountRepository),
      changeMyEmail: new ChangeMyEmail(accountRepository),
      requestPasswordChangeOtp: new RequestPasswordChangeOtp(accountRepository),
      verifyPasswordChangeOtp: new VerifyPasswordChangeOtp(accountRepository),
      changePasswordWithToken: new ChangePasswordWithToken(accountRepository),
      listMyPermissions: new ListMyPermissions(accountRepository),
    },
    analytics: {
      getReport: new GetAnalyticsReport(analyticsRepository),
      getScopes: new GetAnalyticsScopes(analyticsRepository),
      getFilterOptions: new GetFilterOptions(analyticsRepository),
      getOpenCourses: new GetOpenCourses(analyticsRepository),
      getWorkQueue: new GetWorkQueue(analyticsRepository),
      getRecords: new GetAnalyticsRecords(analyticsRepository),
    },
    resource: new HttpResourceGateway(http),
  };
}
