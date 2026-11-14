import type { Page } from '@/core/domain/page';

import type {
  MyPermission,
  MyPermissionFilterOptions,
  MyPermissionFilters,
  MyProfile,
  PasswordOtpChallenge,
} from '../domain/entities';
import type { ProfileChanges } from '../domain/profile-edit';
import type { AccountRepository } from '../domain/repository';

import { toMyProfile, toPasswordOtp, toPermissionPage } from './account-mapper';
import type { AccountRemoteDataSource } from './account-remote-data-source';

export class AccountRepositoryImpl implements AccountRepository {
  constructor(private readonly remote: AccountRemoteDataSource) {}

  async getProfile(): Promise<MyProfile> {
    return toMyProfile(await this.remote.profile());
  }

  async updateMyProfile(changes: ProfileChanges): Promise<void> {
    await this.remote.updateProfile({ ...changes });
  }

  async changeEmail(email: string, currentPassword: string): Promise<void> {
    await this.remote.changeEmail(email, currentPassword);
  }

  async requestPasswordChangeOtp(oldPassword: string): Promise<PasswordOtpChallenge> {
    return toPasswordOtp(await this.remote.sendPasswordOtp(oldPassword));
  }

  async verifyPasswordChangeOtp(otp: string): Promise<string> {
    return (await this.remote.verifyPasswordOtp(otp)).changeToken;
  }

  changePassword(changeToken: string, newPassword: string, confirmPassword: string): Promise<void> {
    return this.remote.changePassword(changeToken, newPassword, confirmPassword);
  }

  async listMyPermissions(
    page: number,
    size: number,
    search?: string,
    filters?: MyPermissionFilters,
  ): Promise<Page<MyPermission>> {
    const clean = Object.fromEntries(
      Object.entries(filters ?? {}).filter(([, value]) => Boolean(value)),
    ) as Record<string, string>;
    return toPermissionPage(await this.remote.permissions(page, size, search, clean));
  }

  async myPermissionFilterOptions(): Promise<MyPermissionFilterOptions> {
    const data = await this.remote.permissionFilterOptions();
    return { modules: data.modules ?? [], actions: data.actions ?? [] };
  }
}
