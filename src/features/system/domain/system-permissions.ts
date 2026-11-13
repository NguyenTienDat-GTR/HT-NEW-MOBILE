import {
  hasPermissionPrefix,
  isSuperAdmin,
  type PermissionSubject,
} from '@/core/domain/permissions';

/** Người dùng kèm tên đăng nhập (AuthUser thỏa kiểu này). */
export interface SystemSubject extends PermissionSubject {
  username?: string;
}

type Maybe = SystemSubject | null | undefined;
type Row = Record<string, unknown>;

export const canManageAccounts = (u: Maybe) => hasPermissionPrefix(u, 'system.account.manage.');
export const canResetPasswords = (u: Maybe) =>
  hasPermissionPrefix(u, 'system.account.reset_password.');
export const canReadRoles = (u: Maybe) => hasPermissionPrefix(u, 'system.role.read.');
export const canCreateRoles = (u: Maybe) => hasPermissionPrefix(u, 'system.role.create.');
export const canUpdateRoles = (u: Maybe) => hasPermissionPrefix(u, 'system.role.update.');
export const canToggleRoles = (u: Maybe) => hasPermissionPrefix(u, 'system.role.toggle.');
export const canAssignAccountRoles = (u: Maybe) =>
  hasPermissionPrefix(u, 'system.account_role.assign.');
export const canToggleAccountRoles = (u: Maybe) =>
  hasPermissionPrefix(u, 'system.account_role.toggle.') || canAssignAccountRoles(u);
export const canReadAuditLogs = (u: Maybe) => hasPermissionPrefix(u, 'system.audit_log.read.');

/** Tài khoản có vai trò này là vai trò chính hoặc một trong các vai trò khác. */
export function rowHasRole(row: Row, roleCode: string): boolean {
  return (
    row.primaryRoleCode === roleCode ||
    (Array.isArray(row.roleCodes) && row.roleCodes.includes(roleCode))
  );
}

const isOwnAccount = (row: Row, u: Maybe) =>
  typeof row.username === 'string' && row.username === u?.username;

/**
 * Các luật hiện nút theo đúng web (resource-row-permissions.ts). BE kiểm tra lại quyền và phạm vi; ở đây chỉ để không
 * hiện nút chắc chắn bị từ chối.
 */

/** Bật/tắt tài khoản: không phải của chính mình, không phải tài khoản quản trị hệ thống. */
export const canToggleAccountRow = (u: Maybe, row: Row) =>
  canManageAccounts(u) && !isOwnAccount(row, u) && !rowHasRole(row, 'SUPER_ADMIN');

/** Đặt lại mật khẩu tạm: chỉ tài khoản đang hoạt động, không phải của chính mình hay quản trị hệ thống. */
export const canResetPasswordRow = (u: Maybe, row: Row) =>
  canResetPasswords(u) &&
  row.status === true &&
  !isOwnAccount(row, u) &&
  !rowHasRole(row, 'SUPER_ADMIN');

/** Vai trò hệ thống chỉ quản trị hệ thống mới sửa được; quản trị hệ thống thì không bật/tắt vai trò. */
export const canUpdateRoleRow = (u: Maybe, row: Row) =>
  canUpdateRoles(u) && (isSuperAdmin(u) || row.isSystem !== true);

export const canToggleRoleRow = (u: Maybe, row: Row) =>
  canToggleRoles(u) && !isSuperAdmin(u) && row.isSystem !== true;

export const canEditAccountRoleRow = (u: Maybe) => canAssignAccountRoles(u);
export const canToggleAccountRoleRow = (u: Maybe) => canToggleAccountRoles(u);

/** Quyền hạn: danh mục chỉ để xem (sửa và bật/tắt dành riêng cho quản trị hệ thống, làm trên web). */
export const canReadPermissions = (u: Maybe) =>
  hasPermissionPrefix(u, 'system.permission.read.') ||
  hasPermissionPrefix(u, 'system.permission.manage.');
