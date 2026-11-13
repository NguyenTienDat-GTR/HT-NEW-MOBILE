import type { ResourceGateway } from '@/core/resource/resource-gateway';
import type { ListFilterDef } from '@/shared/resource/types';

interface TaxonomyOption {
  code: string;
  name: string;
}
type Taxonomy = Partial<Record<'modules' | 'resources' | 'actions' | 'scopes', TaxonomyOption[]>>;

/** Danh mục phân hệ / đối tượng / thao tác / phạm vi để lọc quyền. */
async function loadTaxonomy(gateway: ResourceGateway, key: keyof Taxonomy) {
  const data = await gateway.call<Taxonomy>('GET', '/system/permissions/taxonomy');
  return (data[key] ?? []).map((item) => ({ value: item.code, label: item.name || item.code }));
}

export const taxonomyFilter = (
  key: string,
  label: string,
  collection: keyof Taxonomy,
): ListFilterDef => ({
  key,
  label,
  options: { load: ({ gateway }) => loadTaxonomy(gateway, collection) },
});

/** Bốn bộ lọc phân loại quyền; `prefix` là đường dẫn tới quyền ("" cho danh mục quyền, "permission." cho bảng phân quyền). */
export const taxonomyFilters = (prefix: string): ListFilterDef[] => [
  taxonomyFilter(`${prefix}module.moduleCode`, 'Phân hệ', 'modules'),
  taxonomyFilter(`${prefix}resource.resourceCode`, 'Đối tượng', 'resources'),
  taxonomyFilter(`${prefix}action.actionCode`, 'Thao tác', 'actions'),
  taxonomyFilter(`${prefix}scope.scopeCode`, 'Phạm vi', 'scopes'),
];
