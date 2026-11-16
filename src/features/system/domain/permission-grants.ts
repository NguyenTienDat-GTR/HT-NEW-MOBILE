import {
  hasPermissionPrefix,
  hasRole,
  isSuperAdmin,
  type PermissionSubject,
} from '@/core/domain/permissions';

import { endOfDayIso } from './account-role-body';
import { taxonomyLabel, type SystemTone } from './system-labels';

type Maybe = PermissionSubject | null | undefined;
type Row = Record<string, unknown>;

// ---- Quyền thao tác (theo web: resource-row-permissions.ts và system.ts) ----

/** Xem danh sách quyền của vai trò: có một trong các quyền xem, phân hoặc thu hồi. */
export const canReadRolePermissions = (u: Maybe) =>
  hasPermissionPrefix(u, 'system.role_permission.');
export const canAssignRolePermissions = (u: Maybe) =>
  hasPermissionPrefix(u, 'system.role_permission.assign.');
export const canRevokeRolePermissions = (u: Maybe) =>
  hasPermissionPrefix(u, 'system.role_permission.revoke.');
export const canManageAccountPermissions = (u: Maybe) =>
  hasPermissionPrefix(u, 'system.account_permission.manage.');

const SYSTEM_ROLE_CODES = new Set([
  'SUPER_ADMIN',
  'ADMIN_DIOCESE',
  'ADMIN_DEANERY',
  'ADMIN_PARISH',
]);

/** Quyền đã thu hồi hoặc hết hạn là vĩnh viễn: không sửa, không thu hồi nữa, chỉ phân quyền mới. */
export const isFinalGrant = (row: Row) => row.validity === 'REVOKED' || row.validity === 'EXPIRED';

const isSystemRoleRow = (row: Row) =>
  row.roleIsSystem === true ||
  (typeof row.roleCode === 'string' && SYSTEM_ROLE_CODES.has(row.roleCode));

/**
 * Sửa hạn quyền của vai trò: vai trò hệ thống chỉ quản trị hệ thống sửa; quyền cấp riêng cho một đơn vị (UNIT_GRANT)
 * do cấp quản lý đơn vị đó chỉnh, BE quyết định quyền cuối cùng.
 */
export const canEditRolePermissionRow = (u: Maybe, row: Row) =>
  canAssignRolePermissions(u) &&
  !isFinalGrant(row) &&
  (isSuperAdmin(u) || row.entryType === 'UNIT_GRANT' || !isSystemRoleRow(row));

// ---- Phân quyền vai trò theo đơn vị (giáo phận / giáo hạt / giáo xứ) ----

/** Cấp của người thao tác khi phân quyền riêng theo đơn vị. */
export type UnitActor = 'super' | 'diocese' | 'deanery' | 'none';

export const unitActorOf = (u: Maybe): UnitActor =>
  isSuperAdmin(u)
    ? 'super'
    : hasRole(u, 'ADMIN_DIOCESE')
      ? 'diocese'
      : hasRole(u, 'ADMIN_DEANERY')
        ? 'deanery'
        : 'none';

/** Vai trò admin cấp dưới mà admin giáo phận / giáo hạt được chỉnh quyền riêng theo đơn vị. */
export function unitScopeEnabled(actor: UnitActor, roleCode: string): boolean {
  if (roleCode === '') return false;
  if (actor === 'super') return true;
  if (actor === 'diocese') return roleCode === 'ADMIN_DEANERY' || roleCode === 'ADMIN_PARISH';
  if (actor === 'deanery') return roleCode === 'ADMIN_PARISH';
  return false;
}

/** Quyền có nằm trong giới hạn phạm vi của người thao tác không (đuôi mã quyền là phạm vi). */
export function unitPermissionAllowed(actor: UnitActor, permissionCode: string): boolean {
  if (actor === 'super') return true;
  if (actor === 'diocese') return permissionCode.endsWith('.deanery') || permissionCode.endsWith('.parish');
  if (actor === 'deanery') return permissionCode.endsWith('.parish');
  return false;
}

export interface UnitIds {
  dioceseId?: string;
  deaneryId?: string;
  parishId?: string;
}

/** Chỉ giữ các id đơn vị không rỗng (để bỏ trống = áp dụng cho cả đơn vị của người thao tác / mặc định chung). */
export function compactUnitIds(input: UnitIds): UnitIds {
  const out: UnitIds = {};
  if (input.dioceseId?.trim()) out.dioceseId = input.dioceseId.trim();
  if (input.deaneryId?.trim()) out.deaneryId = input.deaneryId.trim();
  if (input.parishId?.trim()) out.parishId = input.parishId.trim();
  return out;
}

/** Thu hồi quyền cấp riêng (UNIT_GRANT) phải gửi đúng đơn vị của dòng; dòng mặc định không gửi đơn vị. */
export function rowUnitIds(row: Row): UnitIds {
  if (row.entryType !== 'UNIT_GRANT') return {};
  if (row.scopeLevel === 'DIOCESE' && typeof row.dioceseId === 'string')
    return { dioceseId: row.dioceseId };
  if (row.scopeLevel === 'DEANERY' && typeof row.deaneryId === 'string')
    return { deaneryId: row.deaneryId };
  if (row.scopeLevel === 'PARISH' && typeof row.parishId === 'string')
    return { parishId: row.parishId };
  return {};
}

const ENTRY_TYPES: Record<string, string> = {
  DEFAULT: 'Mặc định chung',
  UNIT_GRANT: 'Cấp riêng cho đơn vị',
  UNIT_EXCLUDE: 'Thu hồi riêng cho đơn vị',
};

export const entryTypeLabel = (value: unknown): string =>
  typeof value === 'string' ? (ENTRY_TYPES[value] ?? '') : '';

/** BE tính `revocable` theo phân cấp (quyền do hệ thống cấp, vai trò của chính mình hoặc cấp cao hơn thì không thu hồi được). */
export const canRevokeRolePermissionRow = (u: Maybe, row: Row) =>
  canRevokeRolePermissions(u) && !isFinalGrant(row) && row.revocable === true;

export const canEditAccountPermissionRow = (u: Maybe, row: Row) =>
  canManageAccountPermissions(u) && !isFinalGrant(row);

export const canRevokeAccountPermissionRow = (u: Maybe, row: Row) =>
  canManageAccountPermissions(u) && !isFinalGrant(row) && row.revocable === true;

// ---- Nhãn ----

const VALIDITY: Record<string, { label: string; tone: SystemTone }> = {
  ACTIVE: { label: 'Còn hiệu lực', tone: 'success' },
  EXPIRED: { label: 'Đã hết hạn (thu hồi)', tone: 'danger' },
  REVOKED: { label: 'Đã thu hồi', tone: 'danger' },
  PERMISSION_DISABLED: { label: 'Quyền đang bị vô hiệu hóa', tone: 'warning' },
};

export const validityLabel = (value: unknown) =>
  typeof value === 'string'
    ? (VALIDITY[value] ?? { label: value, tone: 'neutral' as const })
    : null;

export function revocationReasonText(value: unknown): string {
  if (value === 'EXPIRED') return 'Hết hạn';
  if (value === 'MANUAL') return 'Thu hồi thủ công';
  return typeof value === 'string' ? value : '';
}

// ---- Chọn nhiều quyền ----

export interface PermissionItem {
  permissionCode: string;
  permissionName: string;
  moduleCode: string;
  resourceCode: string;
  actionCode: string;
  scopeCode: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  items: PermissionItem[];
}

export function parseSelection(value: string): string[] {
  try {
    const data = JSON.parse(value) as unknown;
    return Array.isArray(data) ? data.map(String) : [];
  } catch {
    return [];
  }
}

export const stringifySelection = (codes: readonly string[]) => JSON.stringify(codes);

export const permissionLabel = (item: PermissionItem) => item.permissionName || item.permissionCode;

/** Lọc theo từ khóa trong tên, mã và nhãn phân loại (không phân biệt hoa thường). */
export function filterPermissions(
  items: readonly PermissionItem[],
  term: string,
): PermissionItem[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return [...items];
  return items.filter((item) =>
    [
      item.permissionName,
      item.permissionCode,
      taxonomyLabel('resource', item.resourceCode),
      taxonomyLabel('action', item.actionCode),
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle),
  );
}

/** Nhóm theo phân hệ và đối tượng để danh sách dài dễ duyệt; nhóm và quyền trong nhóm xếp theo tên. */
export function groupPermissions(items: readonly PermissionItem[]): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>();
  for (const item of items) {
    const key = `${item.moduleCode}/${item.resourceCode}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: `${taxonomyLabel('module', item.moduleCode)} · ${taxonomyLabel('resource', item.resourceCode)}`,
        items: [],
      };
      groups.set(key, group);
    }
    group.items.push(item);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) =>
        permissionLabel(a).localeCompare(permissionLabel(b), 'vi'),
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}

export const toggleCode = (selected: readonly string[], code: string): string[] =>
  selected.includes(code) ? selected.filter((item) => item !== code) : [...selected, code];

/** Tích cả nhóm; nếu đã tích hết thì bỏ tích cả nhóm. */
export function toggleGroup(selected: readonly string[], codes: readonly string[]): string[] {
  const all = codes.every((code) => selected.includes(code));
  if (all) return selected.filter((code) => !codes.includes(code));
  return [...selected, ...codes.filter((code) => !selected.includes(code))];
}

// ---- Thân gửi ----

/** POST /system/role-permissions/bulk */
export const buildRoleGrantBody = (
  input: {
    roleCode: string;
    permissionCodes: readonly string[];
    expiresAt: string;
  } & UnitIds,
) => ({
  roleCode: input.roleCode.trim(),
  permissionCodes: [...input.permissionCodes],
  expiresAt: endOfDayIso(input.expiresAt),
  ...compactUnitIds(input),
});

/** POST /system/account-permissions/bulk (lý do bắt buộc). */
export const buildAccountGrantBody = (input: {
  username: string;
  permissionCodes: readonly string[];
  reason: string;
  expiresAt: string;
}) => ({
  username: input.username.trim(),
  permissionCodes: [...input.permissionCodes],
  reason: input.reason.trim(),
  expiresAt: endOfDayIso(input.expiresAt),
});

/** PUT /system/role-permissions/{id}: chỉ đổi hạn. */
export const buildRoleGrantUpdateBody = (expiresAt: string) => ({
  expiresAt: endOfDayIso(expiresAt),
});

/** PUT /system/account-permissions/{id}: lý do và hạn. */
export const buildAccountGrantUpdateBody = (input: { reason: string; expiresAt: string }) => ({
  reason: input.reason.trim(),
  expiresAt: endOfDayIso(input.expiresAt),
});
