/**
 * Quyền theo mã `module.resource.action.scope` (xét theo permission chứ không theo role).
 * Port từ FE/src/lib/auth/permissions.ts để hai nền tảng quyết định giống nhau.
 */
export interface PermissionSubject {
  roles: readonly string[];
  permissions: readonly string[];
}

type MaybeSubject = PermissionSubject | null | undefined;

export function hasPermission(user: MaybeSubject, permission: string): boolean {
  return !!user && user.permissions.includes(permission);
}

export function hasAnyPermission(user: MaybeSubject, permissions: readonly string[]): boolean {
  if (permissions.length === 0) return true;
  return permissions.some((permission) => hasPermission(user, permission));
}

export function hasPermissionPrefix(user: MaybeSubject, prefix: string): boolean {
  return !!user && user.permissions.some((permission) => permission.startsWith(prefix));
}

export function isSuperAdmin(user: MaybeSubject): boolean {
  return !!user && user.roles.some((role) => role === 'SUPER_ADMIN' || role === 'ROLE_SUPER_ADMIN');
}

/** Có vai trò này (chấp nhận cả dạng có tiền tố ROLE_). */
export function hasRole(user: MaybeSubject, roleCode: string): boolean {
  return !!user && user.roles.some((role) => role === roleCode || role === `ROLE_${roleCode}`);
}

export function hasAnyRole(user: MaybeSubject, roles: readonly string[] | undefined): boolean {
  if (!roles || roles.length === 0) return true;
  if (!user) return false;
  return roles.some((role) => hasRole(user, role));
}

/** Các module nghiệp vụ mà SUPER_ADMIN không dùng (chỉ quản trị hệ thống). */
const SUPER_ADMIN_HIDDEN_MODULE_PREFIXES = [
  'leader.',
  'executive-board.',
  'training.',
  'training-workflow.',
  'certificate.',
];

export interface RoutePermissionSpec {
  moduleName: string;
  permissionPrefixes: readonly string[];
}

export function isHiddenForSuperAdmin(route: RoutePermissionSpec, user: MaybeSubject): boolean {
  if (!isSuperAdmin(user)) return false;
  return SUPER_ADMIN_HIDDEN_MODULE_PREFIXES.some((prefix) => route.moduleName.startsWith(prefix));
}

/** Được xem màn hình: không bị ẩn theo vai trò và có ít nhất một quyền của màn hình (hoặc màn hình không đòi quyền). */
export function canReadRoute(route: RoutePermissionSpec, user: MaybeSubject): boolean {
  if (isHiddenForSuperAdmin(route, user)) return false;
  return (
    route.permissionPrefixes.length === 0 ||
    route.permissionPrefixes.some((prefix) => hasPermissionPrefix(user, prefix))
  );
}
