// Hợp đồng dữ liệu của /api/analytics/*. BE chỉ trả key + số liệu; nhãn hiển thị nằm ở labels.ts.

export type KpiUnit = 'COUNT' | 'PERCENT' | 'SCORE' | 'HOURS';

export interface Kpi {
  key: string;
  unit: KpiUnit;
  value: number | null;
  previous: number | null;
  /** Chênh lệch tuyệt đối với kỳ trước; với tỷ lệ là điểm phần trăm. */
  delta: number | null;
  /** % thay đổi tương đối, chỉ có khi kỳ trước khác 0 và không phải tỷ lệ. */
  deltaPct: number | null;
  numerator: number | null;
  denominator: number | null;
}

export type MetricValue = number | string | boolean | null;

export interface Breakdown {
  type: string;
  key: string;
  label: string | null;
  metrics: Record<string, MetricValue>;
}

export interface Trend {
  period: string;
  metrics: Record<string, number>;
}

export interface FunnelStep {
  key: string;
  count: number;
  rateOfPrevious: number | null;
  rateOfFirst: number | null;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertItem {
  id: string | null;
  label: string | null;
  value: number | null;
}

export interface Alert {
  key: string;
  severity: AlertSeverity;
  count: number;
  href: string | null;
  items: AlertItem[];
}

export type ScopeType = 'diocese' | 'deanery' | 'parish';
export type AnalyticsScope = 'all' | ScopeType;
export type TimeBucket = 'month' | 'quarter' | 'year';

export interface AppliedFilters {
  fromDate: string;
  toDate: string;
  compareFromDate: string | null;
  compareToDate: string | null;
  timeBucket: TimeBucket;
  groupBy: string | null;
  includeInactiveUnits: boolean;
}

export interface AnalyticsReport {
  scope: AnalyticsScope;
  filters: AppliedFilters;
  kpis: Kpi[];
  breakdowns: Breakdown[];
  trends: Trend[];
  previousTrends: Trend[];
  funnel: FunnelStep[];
  alerts: Alert[];
}

export type AnalyticsEndpoint =
  'overview' | 'organization' | 'leaders' | 'courses' | 'certificates';

export interface ScopeOption {
  type: ScopeType;
  name: string;
}

export interface OpenCourse {
  courseCode: string;
  courseName: string;
  courseType: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  registrationEndAt: string | null;
  hoursLeft: number | null;
  urgency: 'closing' | 'open';
  registeredLeaders: number;
}

export interface WorkQueueItem {
  key: string;
  href: string;
  count: number;
  severity: 'none' | 'normal';
}

export interface FilterOption {
  value: string;
  label: string;
  parent: string | null;
}

export interface FilterOptions {
  deaneries: FilterOption[];
  parishes: FilterOption[];
  courseTypes: FilterOption[];
  courses: FilterOption[];
  leaderLevels: FilterOption[];
}

export type RecordDataset = 'leaders' | 'participations' | 'certificates';
export type RecordCell = string | number | boolean | null;

export interface RecordsPage {
  dataset: RecordDataset;
  columns: string[];
  rows: Record<string, RecordCell>[];
  total: number;
  page: number;
  size: number;
}

/** Đối tượng bấm vào biểu đồ để xem danh sách hồ sơ chi tiết. */
export interface DrillTarget {
  dataset: RecordDataset;
  dimension?: string;
  value?: string;
  title: string;
}
