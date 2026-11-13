import { formatDateTime } from '@/core/domain/date-format';
import type { ResourceGateway, ResourceRow } from '@/core/resource/resource-gateway';
import { flag, joinParts, text } from '@/shared/resource/row';
import type { ListFilterDef, ResourceDefinition } from '@/shared/resource/types';

import { taxonomyLabel } from '../domain/system-labels';

interface TaxonomyOption {
  code: string;
  name: string;
}
type Taxonomy = Partial<Record<'modules' | 'resources' | 'actions' | 'scopes', TaxonomyOption[]>>;

/** Danh mục phân hệ / đối tượng / thao tác / phạm vi để lọc quyền (một lần gọi cho cả bốn bộ lọc). */
async function loadTaxonomy(gateway: ResourceGateway, key: keyof Taxonomy) {
  const data = await gateway.call<Taxonomy>('GET', '/system/permissions/taxonomy');
  return (data[key] ?? []).map((item) => ({ value: item.code, label: item.name || item.code }));
}

const taxonomyFilter = (key: string, label: string, collection: keyof Taxonomy): ListFilterDef => ({
  key,
  label,
  options: { load: ({ gateway }) => loadTaxonomy(gateway, collection) },
});

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
  filters: [
    taxonomyFilter('module.moduleCode', 'Phân hệ', 'modules'),
    taxonomyFilter('resource.resourceCode', 'Đối tượng', 'resources'),
    taxonomyFilter('action.actionCode', 'Thao tác', 'actions'),
    taxonomyFilter('scope.scopeCode', 'Phạm vi', 'scopes'),
  ],
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
