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

/** Danh mục cấp độ huynh trưởng của giáo phận (mảng, không phân trang), dùng cho ô chọn cấp. */
export async function loadLevelOptions(gateway: ResourceGateway): Promise<SelectOption[]> {
  const levels = await gateway.call<{ levelCode: string; levelName: string }[]>(
    'GET',
    '/leader-levels/options',
  );
  return levels.map((level) => ({ value: level.levelCode, label: level.levelName }));
}

interface LevelName {
  levelCode: string;
  levelName: string;
}

/**
 * Danh mục cấp độ của giáo phận (mã -> tên) cho màn chi tiết: khai báo ở `detailContext` của định nghĩa, dùng chung
 * cache với màn chi tiết huynh trưởng. Nhờ đó màn chi tiết hiện tên cấp, không hiện mã (HT_I…).
 */
export const LEVEL_NAMES_CONTEXT = {
  key: ['leader-level-names'],
  load: (gateway: ResourceGateway) => gateway.call<LevelName[]>('GET', '/leader-levels/options'),
} as const;

/** Đổi dữ liệu `detailContext` ở trên thành bảng tra mã -> tên (chưa tải xong thì bảng rỗng). */
export function levelNamesOf(context: unknown): ReadonlyMap<string, string> {
  const list = Array.isArray(context) ? (context as LevelName[]) : [];
  return new Map(list.map((level) => [level.levelCode, level.levelName]));
}
