import type { Page } from '@/core/domain/page';

import type { MyPermission, MyProfile, PasswordOtpChallenge } from '../domain/entities';
import type { AccountRepository } from '../domain/repository';

import { toMyProfile, toPasswordOtp, toPermissionPage } from './account-mapper';
import type { AccountRemoteDataSource } from './account-remote-data-source';

export class AccountRepositoryImpl implements AccountRepository {
  constructor(private readonly remote: AccountRemoteDataSource) {}

  async getProfile(): Promise<MyProfile> {
    return toMyProfile(await this.remote.profile());
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
  ): Promise<Page<MyPermission>> {
    return toPermissionPage(await this.remote.permissions(page, size, search));
  }
}
