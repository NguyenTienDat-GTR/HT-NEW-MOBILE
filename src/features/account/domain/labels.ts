import type { MyProfile } from './entities';

/** Tên cấp huynh trưởng mặc định (khớp dữ liệu seed và FE leader-level-store) để nhãn không bị trống. */
const LEVEL_NAMES: Record<string, string> = {
  NONE: 'Chưa có cấp',
  HT_XU: 'Huynh trưởng xứ',
  DU_TRUONG: 'Dự trưởng',
  HT_I: 'Huynh trưởng cấp I',
  HT_II: 'Huynh trưởng cấp II',
  HT_III: 'Huynh trưởng cấp III',
  HLV_I: 'Huấn luyện viên cấp I',
  HLV_II: 'Huấn luyện viên cấp II',
  HLV_III: 'Huấn luyện viên cấp III',
};

export function leaderLevelName(code?: string | null): string {
  if (!code) return '';
  return LEVEL_NAMES[code] ?? code;
}

export function genderLabel(value?: string | null): string {
  if (value === 'NAM') return 'Nam';
  if (value === 'NU') return 'Nữ';
  return '';
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Quản trị viên',
  ADMIN_DIOCESE: 'Admin Liên đoàn',
  ADMIN_DEANERY: 'Admin Hiệp đoàn',
  ADMIN_PARISH: 'Admin Xứ đoàn',
};

/** Tên vai trò chính: lấy từ hồ sơ (tên trong DB), nếu chưa có thì dùng nhãn theo mã. */
export function primaryRoleName(
  profile: MyProfile | undefined,
  fallbackCodes: readonly string[],
): string {
  const primary = profile?.roles.find((role) => role.primary) ?? profile?.roles[0];
  if (primary) return primary.name;
  const code = (fallbackCodes[0] ?? '').replace(/^ROLE_/, '');
  if (!code) return 'Chưa có vai trò';
  return ROLE_LABELS[code] ?? code.replaceAll('_', ' ').toLowerCase();
}

/** Tên hiển thị: tên thánh + họ tên nếu gắn huynh trưởng, ngược lại là tên đăng nhập. */
export function displayName(profile: MyProfile | undefined, fallbackUsername: string): string {
  const leader = profile?.leader;
  const fullName = leader?.fullName?.trim();
  if (fullName) return [leader?.holyName?.trim(), fullName].filter(Boolean).join(' ');
  return profile?.username ?? fallbackUsername;
}

export type ApprovalTone = 'success' | 'danger' | 'warning';

/** Trạng thái duyệt chứng nhận: nhãn tiếng Việt và tông màu (giống FE resource-format). */
export function approvalStatusLabel(value?: string | null): { label: string; tone: ApprovalTone } {
  const status = value ?? '';
  const tone: ApprovalTone =
    status.includes('APPROVED') || status.includes('COMPLETED')
      ? 'success'
      : status.includes('REJECTED') || status.includes('REVOKED')
        ? 'danger'
        : 'warning';
  const label = status
    .replace('NOT_REQUIRED', 'Không cần duyệt')
    .replace('APPROVED', 'Đã duyệt')
    .replace('REJECTED', 'Từ chối')
    .replace('REVOKED', 'Đã thu hồi')
    .replace('SUBMITTED', 'Chờ duyệt')
    .replace('PENDING', 'Chờ duyệt');
  return { label: label || 'Chờ duyệt', tone };
}
