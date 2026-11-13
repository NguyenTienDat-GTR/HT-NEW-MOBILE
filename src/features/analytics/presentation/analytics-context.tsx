import { createContext, useContext, type ReactNode } from 'react';

import type {
  GetAnalyticsRecords,
  GetAnalyticsReport,
  GetAnalyticsScopes,
  GetFilterOptions,
  GetOpenCourses,
  GetWorkQueue,
} from '../domain/usecases';

/** Phụ thuộc của tính năng phân tích, do composition root cấp. */
export interface AnalyticsDependencies {
  getReport: GetAnalyticsReport;
  getScopes: GetAnalyticsScopes;
  getFilterOptions: GetFilterOptions;
  getOpenCourses: GetOpenCourses;
  getWorkQueue: GetWorkQueue;
  getRecords: GetAnalyticsRecords;
}

const AnalyticsDependenciesContext = createContext<AnalyticsDependencies | null>(null);

export function AnalyticsProvider({
  deps,
  children,
}: {
  deps: AnalyticsDependencies;
  children: ReactNode;
}) {
  return (
    <AnalyticsDependenciesContext.Provider value={deps}>
      {children}
    </AnalyticsDependenciesContext.Provider>
  );
}

export function useAnalyticsDependencies(): AnalyticsDependencies {
  const deps = useContext(AnalyticsDependenciesContext);
  if (!deps) throw new Error('useAnalyticsDependencies phải nằm trong <AnalyticsProvider>');
  return deps;
}
