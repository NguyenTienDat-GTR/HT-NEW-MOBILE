import {
  hasPermission,
  hasPermissionPrefix,
  type PermissionSubject,
} from '@/core/domain/permissions';

export type UnitType = 'DIOCESE' | 'DEANERY' | 'PARISH';

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  DIOCESE: 'Giáo phận',
  DEANERY: 'Giáo hạt',
  PARISH: 'Giáo xứ',
};
const UNIT_TYPES: readonly UnitType[] = ['DIOCESE', 'DEANERY', 'PARISH'];

export function unitTypeLabel(value: string | null | undefined): string {
  return UNIT_TYPE_LABELS[value as UnitType] ?? '';
}

/** Người dùng kèm đơn vị của tài khoản (AuthUser thỏa kiểu này). */
export interface UnitSubject extends PermissionSubject {
  dioceseId?: string | null;
  deaneryId?: string | null;
  parishId?: string | null;
}

type Maybe = PermissionSubject | null | undefined;

const lower = (unitType: string) => unitType.toLowerCase();

// Chức vụ
export const canCreatePosition = (u: Maybe) =>
  hasPermissionPrefix(u, 'organization.position.create.');
/** Các cấp chức vụ mà tài khoản được tạo (có chuỗi quyền đầy đủ theo cấp). */
export const positionCreateLevels = (u: Maybe): UnitType[] =>
  UNIT_TYPES.filter((type) => hasPermission(u, `organization.position.create.${lower(type)}`));
/** Sửa/đổi trạng thái theo cấp của dòng; BE còn đòi đúng đơn vị sở hữu. */
export const canUpdatePosition = (u: Maybe, positionType: string) =>
  hasPermission(u, `organization.position.update.${lower(positionType)}`);
export const canTogglePosition = (u: Maybe, positionType: string) =>
  hasPermission(u, `organization.position.toggle.${lower(positionType)}`);

// Phân công
export const canCreateAssignment = (u: Maybe) =>
  hasPermissionPrefix(u, 'organization.executive_board_assignment.create.');
export const canToggleAssignment = (u: Maybe, unitType: string, active: boolean) =>
  active && hasPermission(u, `organization.executive_board_assignment.toggle.${lower(unitType)}`);

/** Cấp phân công mà tài khoản được tạo, kèm đơn vị của chính họ (thiếu đơn vị thì không phân công được). */
export function assignmentLevels(u: UnitSubject | null | undefined) {
  const unitIdOf: Record<UnitType, string | null | undefined> = {
    DIOCESE: u?.dioceseId,
    DEANERY: u?.deaneryId,
    PARISH: u?.parishId,
  };
  return UNIT_TYPES.filter((type) =>
    hasPermission(u, `organization.executive_board_assignment.create.${lower(type)}`),
  ).map((type) => ({ unitType: type, unitId: unitIdOf[type] ?? null }));
}
