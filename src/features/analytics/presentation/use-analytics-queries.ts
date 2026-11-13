import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { AnalyticsEndpoint, DrillTarget } from '../domain/entities';
import {
  buildAnalyticsQuery,
  withResolvedRange,
  type AnalyticsFilterState,
} from '../domain/filters';

import { useAnalyticsDependencies } from './analytics-context';

const RECORDS_PAGE_SIZE = 15;

/** Chuỗi query của bộ lọc đã quy ra ngày cụ thể: ổn định giữa các lần render nên không tải lại thừa. */
function useResolvedKey(filters: AnalyticsFilterState): string {
  return useMemo(() => JSON.stringify(buildAnalyticsQuery(withResolvedRange(filters))), [filters]);
}

/** Giữ dữ liệu cũ khi đổi bộ lọc của cùng một nhóm: biểu đồ mờ đi thay vì nhảy về khung trống. */
export function useAnalyticsReport(
  endpoint: AnalyticsEndpoint,
  filters: AnalyticsFilterState,
  enabled = true,
) {
  const deps = useAnalyticsDependencies();
  const key = useResolvedKey(filters);
  return useQuery({
    queryKey: ['analytics', endpoint, key],
    queryFn: () => deps.getReport.execute(endpoint, filters),
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === endpoint ? previous : undefined,
    // BE giới hạn 120 lần đọc/phút mỗi tài khoản: cache 1 phút.
    staleTime: 60_000,
    enabled,
  });
}

export function useAnalyticsScopes() {
  const deps = useAnalyticsDependencies();
  return useQuery({
    queryKey: ['analytics', 'scopes'],
    queryFn: () => deps.getScopes.execute(),
    staleTime: 10 * 60_000,
  });
}

export function useFilterOptions(scope: string, enabled = true) {
  const deps = useAnalyticsDependencies();
  return useQuery({
    queryKey: ['analytics', 'filter-options', scope],
    queryFn: () => deps.getFilterOptions.execute(scope),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useOpenCourses(scope: string, enabled = true) {
  const deps = useAnalyticsDependencies();
  return useQuery({
    queryKey: ['analytics', 'open-courses', scope],
    queryFn: () => deps.getOpenCourses.execute(scope),
    staleTime: 60_000,
    enabled,
  });
}

export function useWorkQueue(scope: string, enabled = true) {
  const deps = useAnalyticsDependencies();
  return useQuery({
    queryKey: ['analytics', 'work-queue', scope],
    queryFn: () => deps.getWorkQueue.execute(scope),
    enabled,
  });
}

/** Danh sách hồ sơ phía sau một ô biểu đồ, cuộn/“Xem thêm” từng trang 15 dòng. */
export function useAnalyticsRecords(filters: AnalyticsFilterState, target: DrillTarget | null) {
  const deps = useAnalyticsDependencies();
  const key = useResolvedKey(filters);
  return useInfiniteQuery({
    queryKey: ['analytics', 'records', target?.dataset, target?.dimension, target?.value, key],
    enabled: target !== null,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      deps.getRecords.execute(filters, target as DrillTarget, pageParam, RECORDS_PAGE_SIZE),
    getNextPageParam: (last) =>
      (last.page + 1) * last.size < last.total ? last.page + 1 : undefined,
    placeholderData: keepPreviousData,
  });
}
