import { canReadRoute, type PermissionSubject } from '@/core/domain/permissions';

export type MenuGroupId =
  'organization' | 'leaders' | 'executive-board' | 'training' | 'certificates' | 'system';

export interface MenuEntry {
  /** Trùng id tài nguyên trong resource-registry; đường dẫn là /res/<id>. */
  resource: string;
  group: MenuGroupId;
  label: string;
  hint?: string;
  /** Tên module dùng cho luật ẩn của SUPER_ADMIN (leader., executive-board., training.…). */
  moduleName: string;
  /** Hiện khi có ít nhất một quyền bắt đầu bằng tiền tố này (giống canReadRoute của web). */
  permissionPrefixes: readonly string[];
}

export const MENU_GROUP_LABELS: Record<MenuGroupId, string> = {
  organization: 'Tổ chức',
  leaders: 'Huynh trưởng',
  'executive-board': 'Ban điều hành',
  training: 'Huấn luyện',
  certificates: 'Chứng nhận',
  system: 'Hệ thống',
};

/** Thứ tự và điều kiện hiển thị theo sidebar của web (FE/src/config/routes/groups). */
export const MENU_ENTRIES: readonly MenuEntry[] = [
  {
    resource: 'dioceses',
    group: 'organization',
    label: 'Giáo phận',
    moduleName: 'organization.diocese',
    permissionPrefixes: ['organization.diocese.read.'],
  },
  {
    resource: 'deaneries',
    group: 'organization',
    label: 'Giáo hạt',
    moduleName: 'organization.deanery',
    permissionPrefixes: ['organization.deanery.read.'],
  },
  {
    resource: 'parishes',
    group: 'organization',
    label: 'Giáo xứ / họ / điểm',
    moduleName: 'organization.parish',
    permissionPrefixes: ['organization.parish.read.'],
  },
  {
    resource: 'leaders',
    group: 'leaders',
    label: 'Hồ sơ huynh trưởng',
    moduleName: 'leader.profiles',
    permissionPrefixes: ['organization.leader.read.'],
  },
  {
    resource: 'leader-levels',
    group: 'leaders',
    label: 'Cấp độ huynh trưởng',
    moduleName: 'system.leader-levels',
    permissionPrefixes: ['system.leader_level.read.'],
  },
  {
    resource: 'positions',
    group: 'executive-board',
    label: 'Chức vụ',
    moduleName: 'executive-board.positions',
    permissionPrefixes: ['organization.position.read.'],
  },
  {
    resource: 'assignments',
    group: 'executive-board',
    label: 'Phân công ban điều hành',
    moduleName: 'executive-board.assignments',
    permissionPrefixes: [
      'organization.executive_board.read.',
      'organization.executive_board_assignment.read.',
    ],
  },
  {
    resource: 'course-types',
    group: 'training',
    label: 'Loại khóa',
    moduleName: 'training.course-type',
    permissionPrefixes: ['training.course_type.read.'],
  },
  {
    resource: 'courses',
    group: 'training',
    label: 'Khóa huấn luyện',
    moduleName: 'training.course',
    permissionPrefixes: ['training.course.read.', 'training.participation.submit.parish'],
  },
  {
    resource: 'registrations',
    group: 'training',
    label: 'Đăng ký tham dự',
    moduleName: 'training.registration',
    permissionPrefixes: ['training.participation.read.parish', 'training.participation.submit.'],
  },
  {
    resource: 'approvals',
    group: 'training',
    label: 'Duyệt đăng ký',
    moduleName: 'training.approval',
    permissionPrefixes: [
      'training.participation.approve.deanery',
      'training.participation.approve.diocese',
    ],
  },
  {
    resource: 'cross-deanery',
    group: 'training',
    label: 'Gửi liên giáo hạt',
    moduleName: 'training.cross-deanery',
    permissionPrefixes: [
      'training.participation.submit.parish',
      'training.participation.submit.deanery',
      'training.participation.cross_approve.',
    ],
  },
  {
    resource: 'participants',
    group: 'training',
    label: 'Danh sách tham dự',
    moduleName: 'training.participation',
    permissionPrefixes: [
      'training.participation.read.deanery',
      'training.participation.read.diocese',
      'training.participation.approve.deanery',
      'training.participation.approve.diocese',
    ],
  },
  {
    resource: 'scores',
    group: 'training',
    label: 'Chấm điểm',
    moduleName: 'training.score',
    permissionPrefixes: [
      'training.participation.score.deanery',
      'training.participation.score.diocese',
    ],
  },
  {
    resource: 'certificates',
    group: 'certificates',
    label: 'Danh sách chứng nhận',
    moduleName: 'certificate.list',
    permissionPrefixes: ['training.certificate.read.'],
  },
  {
    resource: 'certificate-approvals',
    group: 'certificates',
    label: 'Duyệt chứng nhận',
    moduleName: 'certificate.approval',
    permissionPrefixes: ['training.certificate.approve.'],
  },
  {
    resource: 'accounts',
    group: 'system',
    label: 'Tài khoản',
    moduleName: 'system.account',
    permissionPrefixes: ['system.account.manage.'],
  },
  {
    resource: 'roles',
    group: 'system',
    label: 'Vai trò',
    moduleName: 'system.role',
    permissionPrefixes: ['system.role.read.'],
  },
  {
    resource: 'permissions',
    group: 'system',
    label: 'Quyền hạn',
    moduleName: 'system.permission',
    permissionPrefixes: ['system.permission.read.', 'system.permission.manage.'],
  },
  {
    resource: 'account-roles',
    group: 'system',
    label: 'Gán vai trò',
    moduleName: 'system.account-role',
    permissionPrefixes: ['system.account_role.assign.'],
  },
  {
    resource: 'role-permissions',
    group: 'system',
    label: 'Phân quyền vai trò',
    moduleName: 'system.role-permission',
    permissionPrefixes: [
      'system.role_permission.read.',
      'system.role_permission.assign.',
      'system.role_permission.revoke.',
    ],
  },
  {
    resource: 'account-permissions',
    group: 'system',
    label: 'Phân quyền tài khoản',
    moduleName: 'system.account-permission',
    permissionPrefixes: ['system.account_permission.manage.'],
  },
  {
    resource: 'audit-logs',
    group: 'system',
    label: 'Nhật ký hệ thống',
    moduleName: 'system.audit-log',
    permissionPrefixes: ['system.audit_log.read.'],
  },
];

/** Người dùng được thấy một mục menu (vd. 'courses'); dùng cho các tab dưới cùng. */
export function canSeeMenuEntry(
  resource: string,
  user: PermissionSubject | null | undefined,
): boolean {
  const entry = MENU_ENTRIES.find((item) => item.resource === resource);
  return (
    !!entry &&
    canReadRoute(
      { moduleName: entry.moduleName, permissionPrefixes: entry.permissionPrefixes },
      user,
    )
  );
}

export interface MenuSection {
  group: MenuGroupId;
  label: string;
  entries: MenuEntry[];
}

/** Các nhóm menu người dùng được thấy; nhóm không còn mục nào thì ẩn cả nhóm. */
export function visibleMenuSections(user: PermissionSubject | null | undefined): MenuSection[] {
  const sections: MenuSection[] = [];
  for (const entry of MENU_ENTRIES) {
    if (
      !canReadRoute(
        { moduleName: entry.moduleName, permissionPrefixes: entry.permissionPrefixes },
        user,
      )
    )
      continue;
    let section = sections.find((item) => item.group === entry.group);
    if (!section) {
      section = { group: entry.group, label: MENU_GROUP_LABELS[entry.group], entries: [] };
      sections.push(section);
    }
    section.entries.push(entry);
  }
  return sections;
}
