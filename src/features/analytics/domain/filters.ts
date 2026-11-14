import { formatDate } from '@/core/domain/date-format';

import type { ScopeType, TimeBucket } from './entities';

/** Trạng thái bộ lọc ở app: chuỗi rỗng nghĩa là không lọc. */
export interface AnalyticsFilterState {
  /** Chỉ dùng khi preset = custom. */
  fromDate: string;
  toDate: string;
  preset: DatePresetId;
  timeBucket: TimeBucket;
  compare: boolean;
  deaneryId: string;
  parishId: string;
  courseType: string;
  courseCode: string;
  leaderLevel: string;
  gender: string;
  groupBy: string;
  includeInactiveUnits: boolean;
  /** Phạm vi đang xem khi tài khoản có nhiều quyền phạm vi; rỗng là phạm vi rộng nhất. */
  scope: '' | ScopeType;
}

export type DatePresetId =
  | 'last30Days'
  | 'last90Days'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'last12Months'
  | 'thisYear'
  | 'lastYear'
  | 'custom';

export const DATE_PRESETS: readonly { id: DatePresetId; label: string }[] = [
  { id: 'last30Days', label: '30 ngày qua' },
  { id: 'last90Days', label: '90 ngày qua' },
  { id: 'thisMonth', label: 'Tháng này' },
  { id: 'lastMonth', label: 'Tháng trước' },
  { id: 'thisQuarter', label: 'Quý này' },
  { id: 'lastQuarter', label: 'Quý trước' },
  { id: 'last12Months', label: '12 tháng qua' },
  { id: 'thisYear', label: 'Năm nay' },
  { id: 'lastYear', label: 'Năm trước' },
];

export const DEFAULT_FILTERS: AnalyticsFilterState = {
  fromDate: '',
  toDate: '',
  preset: 'last12Months',
  timeBucket: 'month',
  compare: true,
  deaneryId: '',
  parishId: '',
  courseType: '',
  courseCode: '',
  leaderLevel: '',
  gender: '',
  groupBy: '',
  includeInactiveUnits: false,
  scope: '',
};

const pad = (value: number) => String(value).padStart(2, '0');

export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Khoảng ngày [from, to] của preset; `last12Months` trả rỗng để BE dùng mặc định (12 tháng gần nhất). */
export function resolvePreset(
  id: string,
  today: Date = new Date(),
): { fromDate: string; toDate: string } {
  const year = today.getFullYear();
  const month = today.getMonth();
  const quarterStart = Math.floor(month / 3) * 3;
  switch (id) {
    case 'last30Days':
      return {
        fromDate: isoDate(new Date(year, month, today.getDate() - 29)),
        toDate: isoDate(today),
      };
    case 'last90Days':
      return {
        fromDate: isoDate(new Date(year, month, today.getDate() - 89)),
        toDate: isoDate(today),
      };
    case 'thisMonth':
      return {
        fromDate: isoDate(new Date(year, month, 1)),
        toDate: isoDate(new Date(year, month + 1, 0)),
      };
    case 'lastMonth':
      return {
        fromDate: isoDate(new Date(year, month - 1, 1)),
        toDate: isoDate(new Date(year, month, 0)),
      };
    case 'thisQuarter':
      return {
        fromDate: isoDate(new Date(year, quarterStart, 1)),
        toDate: isoDate(new Date(year, quarterStart + 3, 0)),
      };
    case 'lastQuarter':
      return {
        fromDate: isoDate(new Date(year, quarterStart - 3, 1)),
        toDate: isoDate(new Date(year, quarterStart, 0)),
      };
    case 'thisYear':
      return { fromDate: `${year}-01-01`, toDate: `${year}-12-31` };
    case 'lastYear':
      return { fromDate: `${year - 1}-01-01`, toDate: `${year - 1}-12-31` };
    default:
      return { fromDate: '', toDate: '' };
  }
}

/** Áp preset vào bộ lọc; `custom` giữ nguyên ngày đã nhập. */
export function withResolvedRange(
  filters: AnalyticsFilterState,
  today: Date = new Date(),
): AnalyticsFilterState {
  if (filters.preset === 'custom') return filters;
  return { ...filters, ...resolvePreset(filters.preset, today) };
}

/**
 * Khoảng ngày đang hiển thị trong ô "Từ ngày / Đến ngày": preset thì tính ra, `custom` thì theo ngày đã chọn; mặc định
 * 12 tháng qua (BE tự tính) lấy khoảng thực tế BE đã dùng (`applied`) nếu có.
 */
export function effectiveRange(
  filters: AnalyticsFilterState,
  applied?: { fromDate?: string | null; toDate?: string | null },
  today: Date = new Date(),
): { fromDate: string; toDate: string } {
  if (filters.preset === 'custom') return { fromDate: filters.fromDate, toDate: filters.toDate };
  const resolved = resolvePreset(filters.preset, today);
  return filters.preset === 'last12Months'
    ? { fromDate: applied?.fromDate ?? '', toDate: applied?.toDate ?? '' }
    : resolved;
}

export function presetLabel(filters: AnalyticsFilterState): string {
  if (filters.preset === 'custom') {
    return filters.fromDate || filters.toDate
      ? `${formatDate(filters.fromDate) || '…'} → ${formatDate(filters.toDate) || '…'}`
      : 'Tùy chọn';
  }
  return DATE_PRESETS.find((preset) => preset.id === filters.preset)?.label ?? '12 tháng qua';
}

const QUERY_KEYS = [
  'fromDate',
  'toDate',
  'timeBucket',
  'deaneryId',
  'parishId',
  'courseType',
  'courseCode',
  'leaderLevel',
  'gender',
  'groupBy',
  'scope',
] as const;

/**
 * Tham số query gửi BE. Giá trị mặc định (compare = true, includeInactiveUnits = false, timeBucket = month) không gửi,
 * để bộ lọc mặc định luôn cho query rỗng và cùng khóa cache. `extra` dùng cho dataset/dimension khi xem chi tiết.
 */
export function buildAnalyticsQuery(
  filters: AnalyticsFilterState,
  extra: Record<string, string | number | undefined> = {},
): Record<string, string> {
  const params: Record<string, string> = {};
  for (const key of QUERY_KEYS) {
    const value = filters[key];
    if (value && !(key === 'timeBucket' && value === 'month')) params[key] = value;
  }
  if (!filters.compare) params.compare = 'false';
  if (filters.includeInactiveUnits) params.includeInactiveUnits = 'true';
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== '') params[key] = String(value);
  }
  return params;
}

/** Số bộ lọc đang áp (ngoài khoảng thời gian mặc định), để hiện huy hiệu trên nút "Bộ lọc". */
export function activeFilterCount(filters: AnalyticsFilterState): number {
  let count = 0;
  if (filters.preset !== 'last12Months') count += 1;
  if (filters.timeBucket !== 'month') count += 1;
  if (!filters.compare) count += 1;
  for (const key of [
    'deaneryId',
    'parishId',
    'courseType',
    'courseCode',
    'leaderLevel',
    'gender',
    'groupBy',
    'scope',
  ] as const) {
    if (filters[key]) count += 1;
  }
  if (filters.includeInactiveUnits) count += 1;
  return count;
}

/** Bộ lọc nào có nghĩa với màn nào: ẩn bộ lọc không ảnh hưởng số liệu để người xem không chỉnh vô ích. */
export interface FilterVisibility {
  course: boolean;
  leader: boolean;
  unit: boolean;
  groupBy: boolean;
  inactive: boolean;
  groupByValues?: readonly string[];
}

export type AnalysisTabId = 'courses' | 'certificates' | 'leaders' | 'organization';

const ALL_GROUPS = [
  'courseType',
  'course',
  'deanery',
  'parish',
  'leaderLevel',
  'gender',
  'year',
] as const;

export const ANALYSIS_FILTER_VISIBILITY: Record<AnalysisTabId, FilterVisibility> = {
  courses: {
    course: true,
    leader: true,
    unit: true,
    groupBy: true,
    inactive: false,
    groupByValues: ALL_GROUPS,
  },
  certificates: {
    course: true,
    leader: true,
    unit: true,
    groupBy: true,
    inactive: false,
    groupByValues: ALL_GROUPS,
  },
  leaders: {
    course: false,
    leader: true,
    unit: true,
    groupBy: true,
    inactive: true,
    groupByValues: ['deanery', 'parish', 'leaderLevel', 'gender', 'year'],
  },
  organization: { course: false, leader: true, unit: true, groupBy: false, inactive: true },
};

/** Tổng quan: giáo hạt/giáo phận có bộ lọc khóa + đơn vị; giáo xứ chỉ có kỳ. */
export const OVERVIEW_FILTER_VISIBILITY: FilterVisibility = {
  course: true,
  leader: false,
  unit: true,
  groupBy: false,
  inactive: false,
};
export const PARISH_OVERVIEW_FILTER_VISIBILITY: FilterVisibility = {
  course: false,
  leader: false,
  unit: false,
  groupBy: false,
  inactive: false,
};
