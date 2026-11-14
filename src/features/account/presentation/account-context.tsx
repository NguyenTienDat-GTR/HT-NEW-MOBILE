import { createContext, useContext, type ReactNode } from 'react';

import type {
  ChangeMyEmail,
  ChangePasswordWithToken,
  GetMyProfile,
  UpdateMyProfile,
  ListMyPermissions,
  RequestPasswordChangeOtp,
  VerifyPasswordChangeOtp,
  GetMyPermissionFilterOptions,
} from '../domain/usecases';

/** Phụ thuộc của tính năng tài khoản, do composition root cấp. */
export interface AccountDependencies {
  getMyProfile: GetMyProfile;
  updateMyProfile: UpdateMyProfile;
  changeMyEmail: ChangeMyEmail;
  requestPasswordChangeOtp: RequestPasswordChangeOtp;
  verifyPasswordChangeOtp: VerifyPasswordChangeOtp;
  changePasswordWithToken: ChangePasswordWithToken;
  listMyPermissions: ListMyPermissions;
  getMyPermissionFilterOptions: GetMyPermissionFilterOptions;
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
