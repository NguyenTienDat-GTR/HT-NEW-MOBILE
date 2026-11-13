/** Hình dạng dữ liệu BE trả về (lỏng: mọi trường có thể thiếu); mapper chuẩn hóa sang entity của domain. */
export interface KpiDto {
  key: string;
  unit?: 'COUNT' | 'PERCENT' | 'SCORE' | 'HOURS' | null;
  value?: number | null;
  previous?: number | null;
  delta?: number | null;
  deltaPct?: number | null;
  numerator?: number | null;
  denominator?: number | null;
}

export interface BreakdownDto {
  type: string;
  key: string;
  label?: string | null;
  metrics?: Record<string, number | string | boolean | null> | null;
}

export interface TrendDto {
  period: string;
  metrics?: Record<string, number> | null;
}

export interface FunnelStepDto {
  key: string;
  count?: number | null;
  rateOfPrevious?: number | null;
  rateOfFirst?: number | null;
}

export interface AlertDto {
  key: string;
  severity?: 'critical' | 'warning' | 'info' | null;
  count?: number | null;
  href?: string | null;
  items?: { id?: string | null; label?: string | null; value?: number | null }[] | null;
}

export interface AnalyticsDto {
  scope?: 'all' | 'diocese' | 'deanery' | 'parish' | null;
  filters?: {
    fromDate?: string | null;
    toDate?: string | null;
    compareFromDate?: string | null;
    compareToDate?: string | null;
    timeBucket?: 'month' | 'quarter' | 'year' | null;
    groupBy?: string | null;
    includeInactiveUnits?: boolean | null;
  } | null;
  kpis?: KpiDto[] | null;
  breakdowns?: BreakdownDto[] | null;
  trends?: TrendDto[] | null;
  previousTrends?: TrendDto[] | null;
  funnel?: FunnelStepDto[] | null;
  alerts?: AlertDto[] | null;
}

export interface OpenCourseDto {
  courseCode: string;
  courseName?: string | null;
  courseType?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  registrationEndAt?: string | null;
  hoursLeft?: number | null;
  urgency?: 'closing' | 'open' | null;
  registeredLeaders?: number | null;
}

export interface WorkQueueDto {
  key: string;
  href?: string | null;
  count?: number | null;
  severity?: 'none' | 'normal' | null;
}

export interface FilterOptionDto {
  value: string;
  label?: string | null;
  parent?: string | null;
}

export interface FilterOptionsDto {
  deaneries?: FilterOptionDto[] | null;
  parishes?: FilterOptionDto[] | null;
  courseTypes?: FilterOptionDto[] | null;
  courses?: FilterOptionDto[] | null;
  leaderLevels?: FilterOptionDto[] | null;
}

export interface RecordsDto {
  dataset?: 'leaders' | 'participations' | 'certificates' | null;
  columns?: string[] | null;
  rows?: Record<string, string | number | boolean | null>[] | null;
  total?: number | null;
  page?: number | null;
  size?: number | null;
}

export interface ScopeDto {
  type: 'diocese' | 'deanery' | 'parish';
  name?: string | null;
}
