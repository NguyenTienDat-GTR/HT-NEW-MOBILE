import {
  hasPermission,
  hasPermissionPrefix,
  hasRole,
  isSuperAdmin,
  type PermissionSubject,
} from '@/core/domain/permissions';

/** Người dùng kèm đơn vị của tài khoản (AuthUser thỏa kiểu này). */
export interface OrgSubject extends PermissionSubject {
  dioceseId?: string | null;
  deaneryId?: string | null;
  parishId?: string | null;
}

type Maybe = OrgSubject | null | undefined;

/**
 * Quyền hiển thị nút theo đúng quy tắc của web (FE/src/components/common/resource/resource-row-permissions.ts).
 * BE vẫn là nơi quyết định cuối; các hàm này chỉ ẩn nút chắc chắn bị từ chối.
 */

// Giáo phận
export const canCreateDiocese = (u: Maybe) =>
  hasPermissionPrefix(u, 'organization.diocese.create.');
export const canUpdateDiocese = (u: Maybe) =>
  hasPermissionPrefix(u, 'organization.diocese.update.') && !isSuperAdmin(u);
export const canToggleDiocese = (u: Maybe) =>
  hasPermissionPrefix(u, 'organization.diocese.toggle.') && isSuperAdmin(u);

// Giáo hạt
export const canCreateDeanery = (u: Maybe) =>
  hasPermissionPrefix(u, 'organization.deanery.create.') && !isSuperAdmin(u);
export function canUpdateDeanery(u: Maybe, rowId: string): boolean {
  if (!hasPermissionPrefix(u, 'organization.deanery.update.') || isSuperAdmin(u)) return false;
  return (
    hasPermission(u, 'organization.deanery.update.all') ||
    hasPermission(u, 'organization.deanery.update.diocese') ||
    (hasPermission(u, 'organization.deanery.update.deanery') &&
      !!u?.deaneryId &&
      u.deaneryId === rowId)
  );
}
export const canToggleDeanery = (u: Maybe) =>
  hasPermissionPrefix(u, 'organization.deanery.toggle.') && hasRole(u, 'ADMIN_DIOCESE');

// Giáo xứ / họ / điểm
export const canCreateParish = (u: Maybe) =>
  hasPermissionPrefix(u, 'organization.parish.create.') && !isSuperAdmin(u);
export const canUpdateParish = (u: Maybe) =>
  hasPermissionPrefix(u, 'organization.parish.update.') && !isSuperAdmin(u);
export const canToggleParish = (u: Maybe) =>
  hasPermissionPrefix(u, 'organization.parish.toggle.') &&
  (hasRole(u, 'ADMIN_DEANERY') ||
    (hasRole(u, 'ADMIN_DIOCESE') && hasPermission(u, 'organization.parish.toggle.diocese')));
/** Đổi giáo xứ cha / nâng lên giáo xứ: cùng điều kiện với quyền tạo giáo xứ. */
export const canChangeParishParent = canCreateParish;
