export interface MyRoleDto {
  code: string;
  name: string;
  primary?: boolean | null;
}

export interface MyLeaderDto {
  id: string;
  holyName?: string | null;
  fullName?: string | null;
  birthDate?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  gender?: string | null;
  leaderLevel?: string | null;
  deaneryName?: string | null;
  parishName?: string | null;
  imageUrl?: string | null;
  imageThumbUrl?: string | null;
}

export interface RankHistoryDto {
  oldLevel?: string | null;
  newLevel?: string | null;
  promotionDate?: string | null;
  courseName?: string | null;
}

export interface CertificateDto {
  certificateCode?: string | null;
  courseName?: string | null;
  issueDate?: string | null;
  approvalStatus?: string | null;
}

export interface MyProfileDto {
  username: string;
  roles?: MyRoleDto[] | null;
  email?: string | null;
  hasLeader?: boolean | null;
  canEditBirthDate?: boolean | null;
  /** Ảnh đại diện của tài khoản không gắn huynh trưởng. */
  imageUrl?: string | null;
  imageThumbUrl?: string | null;
  leader?: MyLeaderDto | null;
  rankHistory?: RankHistoryDto[] | null;
  certificates?: CertificateDto[] | null;
}

export interface MyPermissionDto {
  permissionCode: string;
  permissionName?: string | null;
  description?: string | null;
  moduleName?: string | null;
  resourceName?: string | null;
  actionName?: string | null;
  scopeName?: string | null;
  sourceType?: 'ROLE' | 'ACCOUNT' | null;
  roleName?: string | null;
  note?: string | null;
  assignedByName?: string | null;
  assignedAt?: string | null;
  expiresAt?: string | null;
}

export interface PermissionPageDto {
  content?: MyPermissionDto[] | null;
  totalElements?: number | null;
  totalPages?: number | null;
  number?: number | null;
  size?: number | null;
  first?: boolean | null;
  last?: boolean | null;
}

export interface PasswordOtpDto {
  email?: string | null;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}
