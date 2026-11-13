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

export interface AnalyticsRepository {
  getReport(endpoint: AnalyticsEndpoint, filters: AnalyticsFilterState): Promise<AnalyticsReport>;
  getScopes(): Promise<ScopeOption[]>;
  getFilterOptions(scope: string): Promise<FilterOptions>;
  getOpenCourses(scope: string): Promise<OpenCourse[]>;
  getWorkQueue(scope: string): Promise<WorkQueueItem[]>;
  getRecords(
    filters: AnalyticsFilterState,
    target: DrillTarget,
    page: number,
    size: number,
  ): Promise<RecordsPage>;
}
