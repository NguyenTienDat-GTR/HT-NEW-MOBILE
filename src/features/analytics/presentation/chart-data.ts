import type { BarItem } from '@/shared/charts/BarList';
import type { DonutSegment } from '@/shared/charts/DonutChart';
import type { HeatRow } from '@/shared/charts/Heatmap';
import type { TrendRow, TrendSeries } from '@/shared/charts/TrendChart';
import type { ColorTokens } from '@/shared/theme/tokens';

import type { AnalyticsReport, Breakdown } from '../domain/entities';
import { TREND_LABELS, keyLabel } from '../domain/labels';
import { breakdownsOf, metricNumber, type ChartRow } from '../domain/selectors';

import { seriesColor, statusColor } from './chart-theme';

/** Chuỗi cho biểu đồ xu hướng: nhãn tiếng Việt + màu cố định theo chỉ số. */
export function trendSeries(keys: readonly string[], colors: ColorTokens): TrendSeries[] {
  return keys.map((key) => ({
    key,
    label: TREND_LABELS[key] ?? key,
    color: seriesColor(key, colors),
  }));
}

export function toTrendRows(rows: readonly ChartRow[]): TrendRow[] {
  return rows.map((row) => ({
    period: row.period,
    values: row.values,
    previous: row.previous,
    previousPeriod: row.previousPeriod,
  }));
}

/** Lát donut theo trạng thái: màu cố định theo key trạng thái (NAM/NU, APPROVED...). */
export function statusSegments(
  items: readonly Breakdown[],
  colors: ColorTokens,
  metric = 'count',
): DonutSegment[] {
  return items.map((item) => ({
    key: item.key,
    label: keyLabel(item.key, item.label),
    value: metricNumber(item, metric),
    color: statusColor(item.key, colors),
  }));
}

/** Bản đồ nhiệt: cột là các kỳ của biểu đồ xu hướng, ô lấy từ khóa `p:<kỳ>` của BE. */
export function heatData(report: AnalyticsReport): { columns: string[]; rows: HeatRow[] } {
  const columns = report.trends.map((trend) => trend.period);
  const rows = breakdownsOf(report, 'heat').map((item) => ({
    key: item.key,
    label: item.label ?? item.key,
    cells: columns.map((column) => metricNumber(item, `p:${column}`)),
    total: metricNumber(item, 'total'),
  }));
  return { columns, rows };
}

export type { BarItem };
