import type {
  AnalyticsEndpoint,
  AnalyticsReport,
  DrillTarget,
  FilterOptions,
  OpenCourse,
  RecordsPage,
  ScopeOption,
  WorkQueueItem,
} from './entities';
import type { AnalyticsFilterState } from './filters';
import type { AnalyticsRepository } from './repository';

export class GetAnalyticsReport {
  constructor(private readonly repository: AnalyticsRepository) {}

  execute(endpoint: AnalyticsEndpoint, filters: AnalyticsFilterState): Promise<AnalyticsReport> {
    return this.repository.getReport(endpoint, filters);
  }
}

export class GetAnalyticsScopes {
  constructor(private readonly repository: AnalyticsRepository) {}

  execute(): Promise<ScopeOption[]> {
    return this.repository.getScopes();
  }
}

export class GetFilterOptions {
  constructor(private readonly repository: AnalyticsRepository) {}

  execute(scope: string): Promise<FilterOptions> {
    return this.repository.getFilterOptions(scope);
  }
}

export class GetOpenCourses {
  constructor(private readonly repository: AnalyticsRepository) {}

  execute(scope: string): Promise<OpenCourse[]> {
    return this.repository.getOpenCourses(scope);
  }
}

export class GetWorkQueue {
  constructor(private readonly repository: AnalyticsRepository) {}

  execute(scope: string): Promise<WorkQueueItem[]> {
    return this.repository.getWorkQueue(scope);
  }
}

export class GetAnalyticsRecords {
  constructor(private readonly repository: AnalyticsRepository) {}

  execute(
    filters: AnalyticsFilterState,
    target: DrillTarget,
    page: number,
    size: number,
  ): Promise<RecordsPage> {
    return this.repository.getRecords(filters, target, page, size);
  }
}
