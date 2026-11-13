import type { AnalyticsReport, Breakdown, Kpi, Trend } from './entities';

export function findKpi(report: AnalyticsReport | undefined, key: string): Kpi | undefined {
  return report?.kpis.find((kpi) => kpi.key === key);
}

export function breakdownsOf(report: AnalyticsReport | undefined, type: string): Breakdown[] {
  return (report?.breakdowns ?? []).filter((item) => item.type === type);
}

export function metricNumber(item: Breakdown, key: string): number {
  const value = item.metrics[key];
  return typeof value === 'number' ? value : 0;
}

export function metricNullable(item: Breakdown, key: string): number | null {
  const value = item.metrics[key];
  return typeof value === 'number' ? value : null;
}

export interface ChartRow {
  period: string;
  values: Record<string, number | null>;
  previous: Record<string, number | null> | null;
  previousPeriod: string | null;
}

/** Ghép chuỗi kỳ hiện tại với kỳ liền trước (cùng vị trí) thành các dòng cho biểu đồ xu hướng. */
export function toChartRows(trends: readonly Trend[], previous: readonly Trend[] = []): ChartRow[] {
  return trends.map((item, index) => {
    const before = previous[index];
    return {
      period: item.period,
      values: { ...item.metrics },
      previous: before ? { ...before.metrics } : null,
      previousPeriod: before?.period ?? null,
    };
  });
}

/** "2026-03" -> "T3/26", "2026-Q2" -> "Q2/26"; kỳ năm giữ nguyên. */
export function formatPeriod(period: string): string {
  if (/^\d{4}-\d{2}$/.test(period)) return `T${Number(period.slice(5))}/${period.slice(2, 4)}`;
  const quarter = /^(\d{4})-Q(\d)$/.exec(period);
  if (quarter) return `Q${quarter[2]}/${(quarter[1] ?? '').slice(2)}`;
  return period;
}
