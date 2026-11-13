import { formatDateTime } from '@/core/domain/date-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { flag, joinParts, text } from '@/shared/resource/row';
import type { ResourceDefinition } from '@/shared/resource/types';

import { taxonomyLabel } from '../domain/system-labels';

import { taxonomyFilters } from './taxonomy-filters';

const badges = (row: ResourceRow) => [
  flag(row, 'status')
    ? { label: 'Đang hoạt động', tone: 'success' as const }
    : { label: 'Đã tắt', tone: 'warning' as const },
];

/** Quyền hạn: danh mục chỉ để xem (sửa và bật/tắt dành riêng cho quản trị hệ thống, làm trên web). */
export const permissionsResource: ResourceDefinition = {
  id: 'permissions',
  title: 'Quyền hạn',
  singular: 'Quyền',
  endpoint: '/system/permissions',
  idField: 'permissionCode',
  searchFields: [
    'permissionCode',
    'permissionName',
    'module.moduleCode',
    'resource.resourceCode',
    'action.actionCode',
    'scope.scopeCode',
  ],
  searchPlaceholder: 'Mã hoặc tên quyền',
  filters: taxonomyFilters(''),
  card: (row) => ({
    title: text(row, 'permissionName') || text(row, 'permissionCode'),
    subtitle: text(row, 'permissionCode'),
    lines: [
      joinParts([
        taxonomyLabel('module', row.moduleCode),
        taxonomyLabel('resource', row.resourceCode),
      ]),
      joinParts([taxonomyLabel('action', row.actionCode), taxonomyLabel('scope', row.scopeCode)]),
    ],
    badges: badges(row),
  }),
  detailTitle: (row) => text(row, 'permissionName') || text(row, 'permissionCode'),
  detailBadges: badges,
  detail: (row) => [
    {
      title: 'Quyền',
      fields: [
        { label: 'Mã quyền', value: text(row, 'permissionCode') },
        { label: 'Tên quyền', value: text(row, 'permissionName') },
        { label: 'Mô tả', value: text(row, 'description') },
      ],
    },
    {
      title: 'Phân loại',
      fields: [
        { label: 'Phân hệ', value: taxonomyLabel('module', row.moduleCode) },
        { label: 'Đối tượng', value: taxonomyLabel('resource', row.resourceCode) },
        { label: 'Thao tác', value: taxonomyLabel('action', row.actionCode) },
        { label: 'Phạm vi', value: taxonomyLabel('scope', row.scopeCode) },
      ],
    },
    {
      title: 'Lịch sử ghi nhận',
      collapsed: true,
      fields: [
        { label: 'Người tạo', value: text(row, 'createdByName') },
        { label: 'Ngày tạo', value: formatDateTime(text(row, 'createdAt')) },
        { label: 'Người cập nhật', value: text(row, 'updatedByName') },
        { label: 'Ngày cập nhật', value: formatDateTime(text(row, 'updatedAt')) },
      ],
    },
  ],
  canCreate: () => false,
  canUpdate: () => false,
  canToggle: () => false,
};
