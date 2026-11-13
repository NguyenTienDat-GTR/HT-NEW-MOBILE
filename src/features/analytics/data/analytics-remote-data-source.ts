import type { HttpClient } from '@/core/network/http-client';

import type {
  AnalyticsDto,
  FilterOptionsDto,
  OpenCourseDto,
  RecordsDto,
  ScopeDto,
  WorkQueueDto,
} from './analytics-dto';

export class AnalyticsRemoteDataSource {
  constructor(private readonly http: HttpClient) {}

  report(endpoint: string, query: Record<string, string>): Promise<AnalyticsDto> {
    return this.http.request({ method: 'GET', path: `/analytics/${endpoint}`, query });
  }

  scopes(): Promise<ScopeDto[]> {
    return this.http.request({ method: 'GET', path: '/analytics/scopes' });
  }

  filterOptions(scope: string): Promise<FilterOptionsDto> {
    return this.http.request({
      method: 'GET',
      path: '/analytics/filter-options',
      query: { scope },
    });
  }

  openCourses(scope: string): Promise<OpenCourseDto[]> {
    return this.http.request({ method: 'GET', path: '/analytics/open-courses', query: { scope } });
  }

  workQueue(scope: string): Promise<WorkQueueDto[]> {
    return this.http.request({ method: 'GET', path: '/analytics/work-queue', query: { scope } });
  }

  records(query: Record<string, string>): Promise<RecordsDto> {
    return this.http.request({ method: 'GET', path: '/analytics/records', query });
  }
}
