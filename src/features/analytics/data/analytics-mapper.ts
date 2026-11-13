import type {
  AnalyticsReport,
  FilterOption,
  FilterOptions,
  OpenCourse,
  RecordsPage,
  WorkQueueItem,
} from '../domain/entities';

import type {
  AnalyticsDto,
  FilterOptionDto,
  FilterOptionsDto,
  OpenCourseDto,
  RecordsDto,
  WorkQueueDto,
} from './analytics-dto';

export function toReport(dto: AnalyticsDto): AnalyticsReport {
  const filters = dto.filters ?? {};
  return {
    scope: dto.scope ?? 'parish',
    filters: {
      fromDate: filters.fromDate ?? '',
      toDate: filters.toDate ?? '',
      compareFromDate: filters.compareFromDate ?? null,
      compareToDate: filters.compareToDate ?? null,
      timeBucket: filters.timeBucket ?? 'month',
      groupBy: filters.groupBy ?? null,
      includeInactiveUnits: filters.includeInactiveUnits ?? false,
    },
    kpis: (dto.kpis ?? []).map((kpi) => ({
      key: kpi.key,
      unit: kpi.unit ?? 'COUNT',
      value: kpi.value ?? null,
      previous: kpi.previous ?? null,
      delta: kpi.delta ?? null,
      deltaPct: kpi.deltaPct ?? null,
      numerator: kpi.numerator ?? null,
      denominator: kpi.denominator ?? null,
    })),
    breakdowns: (dto.breakdowns ?? []).map((item) => ({
      type: item.type,
      key: item.key,
      label: item.label ?? null,
      metrics: item.metrics ?? {},
    })),
    trends: (dto.trends ?? []).map((item) => ({
      period: item.period,
      metrics: item.metrics ?? {},
    })),
    previousTrends: (dto.previousTrends ?? []).map((item) => ({
      period: item.period,
      metrics: item.metrics ?? {},
    })),
    funnel: (dto.funnel ?? []).map((step) => ({
      key: step.key,
      count: step.count ?? 0,
      rateOfPrevious: step.rateOfPrevious ?? null,
      rateOfFirst: step.rateOfFirst ?? null,
    })),
    alerts: (dto.alerts ?? []).map((alert) => ({
      key: alert.key,
      severity: alert.severity ?? 'info',
      count: alert.count ?? 0,
      href: alert.href ?? null,
      items: (alert.items ?? []).map((item) => ({
        id: item.id ?? null,
        label: item.label ?? null,
        value: item.value ?? null,
      })),
    })),
  };
}

function toOptions(list: FilterOptionDto[] | null | undefined): FilterOption[] {
  return (list ?? []).map((item) => ({
    value: item.value,
    label: item.label ?? item.value,
    parent: item.parent ?? null,
  }));
}

export function toFilterOptions(dto: FilterOptionsDto): FilterOptions {
  return {
    deaneries: toOptions(dto.deaneries),
    parishes: toOptions(dto.parishes),
    courseTypes: toOptions(dto.courseTypes),
    courses: toOptions(dto.courses),
    leaderLevels: toOptions(dto.leaderLevels),
  };
}

export function toOpenCourse(dto: OpenCourseDto): OpenCourse {
  return {
    courseCode: dto.courseCode,
    courseName: dto.courseName ?? dto.courseCode,
    courseType: dto.courseType ?? null,
    location: dto.location ?? null,
    startDate: dto.startDate ?? null,
    endDate: dto.endDate ?? null,
    registrationEndAt: dto.registrationEndAt ?? null,
    hoursLeft: dto.hoursLeft ?? null,
    urgency: dto.urgency ?? 'open',
    registeredLeaders: dto.registeredLeaders ?? 0,
  };
}

export function toWorkQueueItem(dto: WorkQueueDto): WorkQueueItem {
  return {
    key: dto.key,
    href: dto.href ?? '',
    count: dto.count ?? 0,
    severity: dto.severity ?? 'none',
  };
}

export function toRecordsPage(
  dto: RecordsDto,
  fallbackPage: number,
  fallbackSize: number,
): RecordsPage {
  return {
    dataset: dto.dataset ?? 'leaders',
    columns: dto.columns ?? [],
    rows: dto.rows ?? [],
    total: dto.total ?? 0,
    page: dto.page ?? fallbackPage,
    size: dto.size ?? fallbackSize,
  };
}
