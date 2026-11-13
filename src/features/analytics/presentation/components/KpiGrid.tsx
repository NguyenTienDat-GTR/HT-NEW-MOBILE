import { View } from 'react-native';

import { KpiCard } from '@/shared/charts/KpiCard';
import { useTheme } from '@/shared/theme/theme-provider';

import type { AnalyticsReport, Kpi } from '../../domain/entities';
import {
  KPI_META,
  SNAPSHOT_KPIS,
  deltaTone,
  formatDelta,
  formatKpiValue,
  kpiLabel,
  snapshotFootnote,
} from '../../domain/labels';
import { kpiVisual } from '../chart-theme';

export interface KpiGridProps {
  report: AnalyticsReport;
  /** Các chỉ số cần hiện theo thứ tự; bỏ trống = tất cả chỉ số BE trả về. */
  keys?: readonly string[];
  busy?: boolean;
}

/** Lưới chỉ số 2 cột (luôn 2 cột trên điện thoại, như web), số tự co chữ nên không bị cắt. */
export function KpiGrid({ report, keys, busy = false }: KpiGridProps) {
  const { colors, iconSize, spacing } = useTheme();
  const compare = Boolean(report.filters.compareFromDate);
  const items: Kpi[] = keys
    ? keys
        .map((key) => report.kpis.find((kpi) => kpi.key === key))
        .filter((kpi): kpi is Kpi => Boolean(kpi))
    : report.kpis;

  const rows: Kpi[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <View style={{ gap: spacing.xs }} accessibilityLabel="Chỉ số chính">
      {rows.map((row) => (
        <View
          key={row.map((kpi) => kpi.key).join('+')}
          style={{ flexDirection: 'row', gap: spacing.xs }}
        >
          {row.map((kpi) => {
            const visual = kpiVisual(kpi.key);
            const color = visual.tone(colors);
            const Icon = visual.icon;
            const snapshot = SNAPSHOT_KPIS.has(kpi.key);
            const delta = compare && !snapshot ? formatDelta(kpi) : null;
            return (
              <KpiCard
                key={kpi.key}
                busy={busy}
                label={kpiLabel(kpi.key)}
                valueText={formatKpiValue(kpi.value, kpi.unit)}
                icon={<Icon size={iconSize.sm} color={color} weight="bold" />}
                color={color}
                deltaText={delta}
                deltaTone={
                  delta && kpi.delta !== null
                    ? deltaTone(kpi.delta, KPI_META[kpi.key]?.upIsGood)
                    : 'neutral'
                }
                footnote={snapshot ? snapshotFootnote(kpi) : null}
              />
            );
          })}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}
