export interface MyRole {
  code: string;
  name: string;
  primary: boolean;
}

export interface MyLeaderProfile {
  id: string;
  holyName: string | null;
  fullName: string | null;
  birthDate: string | null;
  email: string | null;
  phoneNumber: string | null;
  gender: string | null;
  leaderLevel: string | null;
  deaneryName: string | null;
  parishName: string | null;
}

export interface RankHistoryEntry {
  oldLevel: string | null;
  newLevel: string | null;
  promotionDate: string | null;
  courseName: string | null;
}

export interface MyCertificate {
  certificateCode: string;
  courseName: string | null;
  issueDate: string | null;
  approvalStatus: string | null;
}

/** Hồ sơ của tài khoản đang đăng nhập (GET /auth/me/profile). */
export interface MyProfile {
  username: string;
  /** Vai trò chính đứng đầu. */
  roles: MyRole[];
  email: string | null;
  hasLeader: boolean;
  leader: MyLeaderProfile | null;
  rankHistory: RankHistoryEntry[];
  certificates: MyCertificate[];
}

/** Một quyền đang có (từ vai trò hoặc cấp riêng cho tài khoản). */
export interface MyPermission {
  code: string;
  name: string;
  description: string | null;
  moduleName: string | null;
  resourceName: string | null;
  actionName: string | null;
  scopeName: string | null;
  source: 'ROLE' | 'ACCOUNT';
  roleName: string | null;
  note: string | null;
  assignedByName: string | null;
  assignedAt: string | null;
  expiresAt: string | null;
}

export interface PasswordOtpChallenge {
  email: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}
