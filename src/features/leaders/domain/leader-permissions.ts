import {
  hasPermission,
  hasPermissionPrefix,
  hasRole,
  type PermissionSubject,
} from '@/core/domain/permissions';

type Maybe = PermissionSubject | null | undefined;

const UNIT_ADMIN_ROLES = ['ADMIN_DIOCESE', 'ADMIN_DEANERY', 'ADMIN_PARISH'] as const;
const isUnitAdmin = (u: Maybe) => UNIT_ADMIN_ROLES.some((role) => hasRole(u, role));

/** Vai trò + quyền cùng cấp (giáo phận/giáo hạt/giáo xứ), đúng cách BE kiểm (LeaderAccessEvaluator). */
function scoped(u: Maybe, action: string): boolean {
  return (
    (hasRole(u, 'ADMIN_DIOCESE') && hasPermission(u, `organization.leader.${action}.diocese`)) ||
    (hasRole(u, 'ADMIN_DEANERY') && hasPermission(u, `organization.leader.${action}.deanery`)) ||
    (hasRole(u, 'ADMIN_PARISH') && hasPermission(u, `organization.leader.${action}.parish`))
  );
}

export const canCreateLeader = (u: Maybe) => scoped(u, 'create');
export const canToggleLeader = (u: Maybe) => scoped(u, 'toggle');
export const canUpdateLeader = (u: Maybe) =>
  hasPermissionPrefix(u, 'organization.leader.update.') && isUnitAdmin(u);
export const canUpdateLeaderBirthDate = (u: Maybe) =>
  hasPermissionPrefix(u, 'organization.leader.update_birth_date.') && isUnitAdmin(u);
export const canTransferLeader = (u: Maybe) =>
  hasPermission(u, 'organization.leader.transfer.diocese') ||
  hasPermission(u, 'organization.leader.transfer.deanery');
/** Tab Chứng nhận dùng endpoint riêng theo huynh trưởng khi có quyền này. */
export const canReadLeaderCertificates = (u: Maybe) =>
  hasPermissionPrefix(u, 'organization.leader_certificate.read.');

// Cấp độ huynh trưởng (danh mục riêng từng giáo phận)
export const canCreateLeaderLevel = (u: Maybe) =>
  hasPermissionPrefix(u, 'system.leader_level.create.');
export const canUpdateLeaderLevel = (u: Maybe) =>
  hasPermissionPrefix(u, 'system.leader_level.update.');
export const canDeleteLeaderLevel = (u: Maybe) =>
  hasPermissionPrefix(u, 'system.leader_level.delete.');
