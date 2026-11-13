import type { ResourceGateway, ResourceRow } from '@/core/resource/resource-gateway';

import type { SelectOption } from './types';

/**
 * Tải lựa chọn cho ô chọn/bộ lọc: đúng cách web làm (`endpoint?page=0&size=100`), giá trị `value`, nhãn `label`.
 * `extra` là bộ lọc JSON và tham số bổ sung (vd. chỉ đơn vị đang hoạt động).
 */
export async function loadOptions(
  gateway: ResourceGateway,
  endpoint: string,
  map: { value: string; label: string | ((row: ResourceRow) => string) },
  extra: { filters?: Record<string, string>; status?: boolean } = {},
): Promise<SelectOption[]> {
  const page = await gateway.list(endpoint, {
    page: 0,
    size: 100,
    filters: extra.filters,
    status: extra.status,
  });
  return page.content
    .map((row) => ({
      value: String(row[map.value] ?? ''),
      label: typeof map.label === 'function' ? map.label(row) : String(row[map.label] ?? ''),
    }))
    .filter((option) => option.value !== '');
}
