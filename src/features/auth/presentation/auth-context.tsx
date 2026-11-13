import { createContext, useContext, type ReactNode } from 'react';

import type { SessionEvents } from '@/core/auth/session';

import type { AcceptPrivacyConsent, GetPrivacyConsent } from '../domain/usecases/privacy-usecases';
import type {
  ChangeTemporaryPassword,
  RequestPasswordResetOtp,
  ResetPassword,
  VerifyPasswordResetOtp,
} from '../domain/usecases/password-usecases';
import type {
  GetCaptchaConfig,
  Login,
  Logout,
  RestoreSession,
} from '../domain/usecases/session-usecases';

/** Phụ thuộc của tính năng auth, do composition root cấp. Presentation chỉ biết use case, không biết data/HTTP. */
export interface AuthDependencies {
  getCaptchaConfig: GetCaptchaConfig;
  login: Login;
  logout: Logout;
  restoreSession: RestoreSession;
  changeTemporaryPassword: ChangeTemporaryPassword;
  requestPasswordResetOtp: RequestPasswordResetOtp;
  verifyPasswordResetOtp: VerifyPasswordResetOtp;
  resetPassword: ResetPassword;
  getPrivacyConsent: GetPrivacyConsent;
  acceptPrivacyConsent: AcceptPrivacyConsent;
  sessionEvents: SessionEvents;
  /** Tên miền dùng làm baseUrl cho WebView Turnstile. */
  siteOrigin: string;
}

const AuthDependenciesContext = createContext<AuthDependencies | null>(null);

export function AuthProvider({ deps, children }: { deps: AuthDependencies; children: ReactNode }) {
  return (
    <AuthDependenciesContext.Provider value={deps}>{children}</AuthDependenciesContext.Provider>
  );
}

export function useAuthDependencies(): AuthDependencies {
  const deps = useContext(AuthDependenciesContext);
  if (!deps) throw new Error('useAuthDependencies phải nằm trong <AuthProvider>');
  return deps;
}
