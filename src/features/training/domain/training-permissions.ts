import {
  hasPermission,
  hasPermissionPrefix,
  type PermissionSubject,
} from '@/core/domain/permissions';

/** Người dùng kèm đơn vị và tên đăng nhập (AuthUser thỏa kiểu này). */
export interface TrainingSubject extends PermissionSubject {
  username?: string;
  dioceseId?: string | null;
  deaneryId?: string | null;
}

type Maybe = TrainingSubject | null | undefined;

export interface CourseOwner {
  managementUnitType?: unknown;
  dioceseId?: unknown;
  deaneryId?: unknown;
}

export type CourseAction =
  'update' | 'toggle' | 'finish' | 'lockScore' | 'approve' | 'score' | 'read' | 'scan';

const ACTION_PERMISSION: Record<CourseAction, string> = {
  update: 'training.course.update',
  toggle: 'training.course.toggle',
  finish: 'training.course.finish',
  lockScore: 'training.participation.lock',
  approve: 'training.participation.approve',
  score: 'training.participation.score',
  read: 'training.participation.read',
  scan: 'training.attendance.scan',
};

/** Khóa do giáo hạt quản lý (theo loại khóa; khóa quá khứ không có loại thì theo đơn vị sở hữu). */
export function isDeaneryManaged(course: CourseOwner): boolean {
  if (course.managementUnitType) return course.managementUnitType === 'DEANERY';
  return Boolean(course.deaneryId);
}

/**
 * Được thao tác khóa này không: khóa giáo phận cần quyền cấp giáo phận, khóa giáo hạt cần quyền cấp giáo hạt và khóa
 * phải thuộc đúng đơn vị của tài khoản. BE vẫn là nơi quyết định cuối; đây chỉ để không hiện nút chắc chắn bị từ chối.
 */
export function canActOnCourse(
  user: Maybe,
  course: CourseOwner | null | undefined,
  action: CourseAction,
) {
  if (!user || !course) return false;
  const base = ACTION_PERMISSION[action];
  if (!course.managementUnitType && !course.deaneryId && !course.dioceseId)
    return hasPermission(user, `${base}.diocese`) || hasPermission(user, `${base}.deanery`);
  if (isDeaneryManaged(course)) {
    if (!hasPermission(user, `${base}.deanery`)) return false;
    return !course.deaneryId || !user.deaneryId || course.deaneryId === user.deaneryId;
  }
  if (!hasPermission(user, `${base}.diocese`)) return false;
  return !course.dioceseId || !user.dioceseId || course.dioceseId === user.dioceseId;
}

/** Gửi đăng ký: giáo phận chỉ cho khóa giáo phận của mình; giáo hạt và giáo xứ cho khóa giáo hạt của mình hoặc khóa giáo phận chủ quản. */
export function canRegisterCourse(user: Maybe, course: CourseOwner | null | undefined) {
  if (!user || !course) return false;
  const sameDiocese = !course.dioceseId || !user.dioceseId || course.dioceseId === user.dioceseId;
  const sameDeanery = !course.deaneryId || !user.deaneryId || course.deaneryId === user.deaneryId;
  if (isDeaneryManaged(course))
    return (
      sameDeanery &&
      (hasPermission(user, 'training.participation.submit.deanery') ||
        hasPermission(user, 'training.participation.submit.parish'))
    );
  return (
    sameDiocese &&
    (hasPermission(user, 'training.participation.submit.diocese') ||
      hasPermission(user, 'training.participation.submit.deanery') ||
      hasPermission(user, 'training.participation.submit.parish'))
  );
}

export const canSubmitRegistration = (u: Maybe) =>
  hasPermissionPrefix(u, 'training.participation.submit.');
export const canApproveRegistrations = (u: Maybe) =>
  hasPermissionPrefix(u, 'training.participation.approve.');
export const canScoreParticipants = (u: Maybe) =>
  hasPermissionPrefix(u, 'training.participation.score.');

// Loại khóa
export const canCreateCourseType = (u: Maybe) =>
  hasPermissionPrefix(u, 'training.course_type.create.');
export const canUpdateCourseType = (u: Maybe) =>
  hasPermissionPrefix(u, 'training.course_type.update.');
export const canToggleCourseType = (u: Maybe) =>
  hasPermissionPrefix(u, 'training.course_type.toggle.');
/** Cấp quản lý (loại khóa/khóa) mà tài khoản được tạo hoặc sửa. */
export function managedUnitTypes(
  u: Maybe,
  resource: 'course' | 'course_type',
): ('DIOCESE' | 'DEANERY')[] {
  return (['DIOCESE', 'DEANERY'] as const).filter(
    (type) =>
      hasPermission(u, `training.${resource}.create.${type.toLowerCase()}`) ||
      hasPermission(u, `training.${resource}.update.${type.toLowerCase()}`),
  );
}

// Khóa
export const canCreateCourse = (u: Maybe) => hasPermissionPrefix(u, 'training.course.create.');

/** Hồ sơ còn chờ duyệt và do chính tài khoản này gửi: được thu hồi/sửa ghi chú. */
export function isOwnPendingSubmission(
  u: Maybe,
  row: { approvalStatus?: unknown; createdBy?: unknown },
) {
  const pending = row.approvalStatus === 'PENDING' || row.approvalStatus === 'SUBMITTED';
  return pending && !!u?.username && row.createdBy === u.username && canSubmitRegistration(u);
}
