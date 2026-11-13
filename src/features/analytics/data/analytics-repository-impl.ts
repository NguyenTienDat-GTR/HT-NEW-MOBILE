import type {
  AnalyticsEndpoint,
  AnalyticsReport,
  DrillTarget,
  FilterOptions,
  OpenCourse,
  RecordsPage,
  ScopeOption,
  WorkQueueItem,
} from '../domain/entities';
import {
  buildAnalyticsQuery,
  withResolvedRange,
  type AnalyticsFilterState,
} from '../domain/filters';
import type { AnalyticsRepository } from '../domain/repository';

import {
  toFilterOptions,
  toOpenCourse,
  toRecordsPage,
  toReport,
  toWorkQueueItem,
} from './analytics-mapper';
import type { AnalyticsRemoteDataSource } from './analytics-remote-data-source';

export class AnalyticsRepositoryImpl implements AnalyticsRepository {
  constructor(private readonly remote: AnalyticsRemoteDataSource) {}

  async getReport(
    endpoint: AnalyticsEndpoint,
    filters: AnalyticsFilterState,
  ): Promise<AnalyticsReport> {
    return toReport(
      await this.remote.report(endpoint, buildAnalyticsQuery(withResolvedRange(filters))),
    );
  }

  async getScopes(): Promise<ScopeOption[]> {
    const scopes = await this.remote.scopes();
    return scopes.map((scope) => ({ type: scope.type, name: scope.name ?? '' }));
  }

  async getFilterOptions(scope: string): Promise<FilterOptions> {
    return toFilterOptions(await this.remote.filterOptions(scope));
  }

  async getOpenCourses(scope: string): Promise<OpenCourse[]> {
    return (await this.remote.openCourses(scope)).map(toOpenCourse);
  }

  async getWorkQueue(scope: string): Promise<WorkQueueItem[]> {
    return (await this.remote.workQueue(scope)).map(toWorkQueueItem);
  }

  async getRecords(
    filters: AnalyticsFilterState,
    target: DrillTarget,
    page: number,
    size: number,
  ): Promise<RecordsPage> {
    const query = buildAnalyticsQuery(withResolvedRange(filters), {
      dataset: target.dataset,
      dimension: target.dimension,
      value: target.value,
      page,
      size,
    });
    return toRecordsPage(await this.remote.records(query), page, size);
  }
}
