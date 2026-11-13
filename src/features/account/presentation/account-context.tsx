import { createContext, useContext, type ReactNode } from 'react';

import type {
  ChangeMyEmail,
  ChangePasswordWithToken,
  GetMyProfile,
  ListMyPermissions,
  RequestPasswordChangeOtp,
  VerifyPasswordChangeOtp,
} from '../domain/usecases';

/** Phụ thuộc của tính năng tài khoản, do composition root cấp. */
export interface AccountDependencies {
  getMyProfile: GetMyProfile;
  changeMyEmail: ChangeMyEmail;
  requestPasswordChangeOtp: RequestPasswordChangeOtp;
  verifyPasswordChangeOtp: VerifyPasswordChangeOtp;
  changePasswordWithToken: ChangePasswordWithToken;
  listMyPermissions: ListMyPermissions;
}

const AccountDependenciesContext = createContext<AccountDependencies | null>(null);

export function AccountProvider({
  deps,
  children,
}: {
  deps: AccountDependencies;
  children: ReactNode;
}) {
  return (
    <AccountDependenciesContext.Provider value={deps}>
      {children}
    </AccountDependenciesContext.Provider>
  );
}

export function useAccountDependencies(): AccountDependencies {
  const deps = useContext(AccountDependenciesContext);
  if (!deps) throw new Error('useAccountDependencies phải nằm trong <AccountProvider>');
  return deps;
}
