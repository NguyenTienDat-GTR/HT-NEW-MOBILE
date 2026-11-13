import { canReadRoute, type PermissionSubject } from '@/core/domain/permissions';

export type MenuGroupId = 'organization' | 'leaders' | 'executive-board';

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
];

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
