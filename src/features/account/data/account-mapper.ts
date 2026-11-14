import type { Page } from '@/core/domain/page';

import type { MyPermission, MyProfile, PasswordOtpChallenge } from '../domain/entities';

import type {
  MyPermissionDto,
  MyProfileDto,
  PasswordOtpDto,
  PermissionPageDto,
} from './account-dto';

export function toMyProfile(dto: MyProfileDto): MyProfile {
  const leader = dto.leader;
  return {
    username: dto.username,
    roles: (dto.roles ?? []).map((role) => ({
      code: role.code,
      name: role.name,
      primary: role.primary ?? false,
    })),
    email: dto.email ?? null,
    hasLeader: dto.hasLeader ?? leader != null,
    canEditBirthDate: dto.canEditBirthDate === true,
    leader: leader
      ? {
          id: leader.id,
          holyName: leader.holyName ?? null,
          fullName: leader.fullName ?? null,
          birthDate: leader.birthDate ?? null,
          email: leader.email ?? null,
          phoneNumber: leader.phoneNumber ?? null,
          gender: leader.gender ?? null,
          leaderLevel: leader.leaderLevel ?? null,
          deaneryName: leader.deaneryName ?? null,
          parishName: leader.parishName ?? null,
          imageUrl: leader.imageThumbUrl ?? leader.imageUrl ?? null,
        }
      : null,
    rankHistory: (dto.rankHistory ?? []).map((row) => ({
      oldLevel: row.oldLevel ?? null,
      newLevel: row.newLevel ?? null,
      promotionDate: row.promotionDate ?? null,
      courseName: row.courseName ?? null,
    })),
    certificates: (dto.certificates ?? [])
      .filter((row) => Boolean(row.certificateCode))
      .map((row) => ({
        certificateCode: row.certificateCode as string,
        courseName: row.courseName ?? null,
        issueDate: row.issueDate ?? null,
        approvalStatus: row.approvalStatus ?? null,
      })),
  };
}

export function toMyPermission(dto: MyPermissionDto): MyPermission {
  return {
    code: dto.permissionCode,
    name: dto.permissionName || dto.permissionCode,
    description: dto.description ?? null,
    moduleName: dto.moduleName ?? null,
    resourceName: dto.resourceName ?? null,
    actionName: dto.actionName ?? null,
    scopeName: dto.scopeName ?? null,
    source: dto.sourceType === 'ACCOUNT' ? 'ACCOUNT' : 'ROLE',
    roleName: dto.roleName ?? null,
    note: dto.note ?? null,
    assignedByName: dto.assignedByName ?? null,
    assignedAt: dto.assignedAt ?? null,
    expiresAt: dto.expiresAt ?? null,
  };
}

export function toPermissionPage(dto: PermissionPageDto): Page<MyPermission> {
  const content = (dto.content ?? []).map(toMyPermission);
  return {
    content,
    totalElements: dto.totalElements ?? content.length,
    totalPages: dto.totalPages ?? 1,
    number: dto.number ?? 0,
    size: dto.size ?? content.length,
    first: dto.first ?? true,
    last: dto.last ?? true,
  };
}

export function toPasswordOtp(dto: PasswordOtpDto): PasswordOtpChallenge {
  return {
    email: dto.email ?? '',
    expiresInSeconds: dto.expiresInSeconds,
    resendAfterSeconds: dto.resendAfterSeconds,
  };
}
