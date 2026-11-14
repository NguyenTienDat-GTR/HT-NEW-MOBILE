import {
  hasPermissionPrefix,
  isSuperAdmin,
  type PermissionSubject,
} from '@/core/domain/permissions';

/**
 * Các lựa chọn khi xuất file từ một khóa (thẻ tham dự PDF, chứng nhận PDF, Excel danh sách đăng ký theo mẫu), theo
 * export-scope.ts và badge-export-dialog của web.
 */
export type ExportLevel = 'DIOCESE' | 'DEANERY' | 'PARISH';
export type TemplateGroupBy = 'NONE' | 'DEANERY' | 'PARISH';
export type TemplateLayout = 'SINGLE_SHEET' | 'SHEET_PER_GROUP' | 'FILE_PER_GROUP';
export type FlipEdge = 'LONG' | 'SHORT';

type Maybe = PermissionSubject | null | undefined;

/** Cấp cao nhất mà tài khoản có quyền hồ sơ tham dự (giáo phận > giáo hạt > giáo xứ); quản trị hệ thống là cấp giáo phận. */
export function exportLevelOf(user: Maybe): ExportLevel {
  if (!user) return 'PARISH';
  if (isSuperAdmin(user)) return 'DIOCESE';
  const scoped = user.permissions.filter((permission) =>
    permission.startsWith('training.participation.'),
  );
  if (scoped.some((permission) => permission.endsWith('.diocese'))) return 'DIOCESE';
  if (scoped.some((permission) => permission.endsWith('.deanery'))) return 'DEANERY';
  return 'PARISH';
}

/** Cách gom danh sách khi xuất theo mẫu: giáo xứ không có lựa chọn; giáo hạt không gom theo giáo hạt. */
export function templateGroupOptions(level: ExportLevel): TemplateGroupBy[] {
  if (level === 'PARISH') return [];
  if (level === 'DEANERY') return ['NONE', 'PARISH'];
  return ['NONE', 'DEANERY', 'PARISH'];
}

export const GROUP_LABELS: Record<TemplateGroupBy, string> = {
  NONE: 'Không gom nhóm (một danh sách)',
  DEANERY: 'Gom theo giáo hạt',
  PARISH: 'Gom theo giáo xứ',
};

export const LAYOUT_LABELS: Record<TemplateLayout, string> = {
  SINGLE_SHEET: 'Một sheet',
  SHEET_PER_GROUP: 'Mỗi nhóm một sheet',
  FILE_PER_GROUP: 'Mỗi nhóm một file',
};

/** Tham số gửi POST /training/participations/template-export (khóa nằm trong bộ lọc, như web). */
export function templateExportQuery(
  courseCode: string,
  groupBy: TemplateGroupBy,
  layout: TemplateLayout,
  options: readonly TemplateGroupBy[],
): Record<string, string> {
  // Giống web: không có lựa chọn gom nhóm (cấp giáo xứ) hoặc lựa chọn không hợp lệ thì lùi về mặc định.
  const effective: TemplateGroupBy =
    options.length === 0 ? 'NONE' : options.includes(groupBy) ? groupBy : 'PARISH';
  return {
    filters: JSON.stringify({ 'course.courseCode': courseCode }),
    groupBy: effective,
    layout: effective === 'NONE' ? 'SINGLE_SHEET' : layout,
  };
}

export interface BadgeExportChoice {
  configId?: string;
  teamName?: string;
  includeBack: boolean;
  flipEdge: FlipEdge;
}

/** Thân gửi POST /training/courses/{mã}/badges/export/jobs (chỉ gửi trường có giá trị). */
export function badgeExportBody(choice: BadgeExportChoice): Record<string, unknown> {
  const body: Record<string, unknown> = {
    includeBack: choice.includeBack,
    flipEdge: choice.flipEdge,
  };
  if (choice.configId) body.configId = choice.configId;
  if (choice.teamName && choice.teamName.trim()) body.teamName = choice.teamName.trim();
  return body;
}

/** Cấu hình thẻ chọn được khi xuất thẻ cho khóa; applied = cấu hình sẽ dùng khi không chọn cấu hình nào. */
export interface UsableBadgeConfig {
  id: string;
  name: string;
  isDefault?: boolean;
  applied: boolean;
  scopeLevel?: 'SYSTEM' | 'DIOCESE' | 'DEANERY';
  hasBack: boolean;
  cardWidthMm?: number;
  cardHeightMm?: number;
  cardsPerPage: number;
  paperSize?: string;
}

export const SCOPE_LABELS: Record<string, string> = {
  SYSTEM: 'Hệ thống',
  DIOCESE: 'Giáo phận',
  DEANERY: 'Giáo hạt',
};

/** Nhãn một cấu hình thẻ trong ô chọn: tên, cấp, khổ thẻ, hai mặt. */
export function badgeConfigLabel(config: UsableBadgeConfig): string {
  const size =
    config.cardWidthMm && config.cardHeightMm
      ? `${config.cardWidthMm}×${config.cardHeightMm} mm`
      : '';
  return [
    config.name,
    config.scopeLevel ? (SCOPE_LABELS[config.scopeLevel] ?? '') : '',
    size,
    config.hasBack ? '2 mặt' : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Được xuất thẻ / Excel theo mẫu: người xem được hồ sơ tham dự của khóa (BE kiểm tra lại). */
export const canExportRegistrations = (user: Maybe): boolean =>
  hasPermissionPrefix(user, 'training.participation.');

/** Được xuất PDF chứng nhận: có quyền xem chứng nhận. */
export const canExportCertificates = (user: Maybe): boolean =>
  hasPermissionPrefix(user, 'training.certificate.read.');
