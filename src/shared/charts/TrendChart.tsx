import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { fmtNumber, formatCompact } from '@/core/domain/number-format';

import { useTheme } from '../theme/theme-provider';
import { fontFamily } from '../theme/tokens';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

import {
  clamp,
  monotonePath,
  niceMax,
  splitSegments,
  thinIndices,
  ticks,
  trendHeight,
  type Point,
} from './chart-math';
import { useMeasuredWidth } from './use-measured-width';

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
}

export interface TrendRow {
  period: string;
  values: Record<string, number | null>;
  /** Giá trị kỳ liền trước cùng vị trí (cho đường nét đứt). */
  previous?: Record<string, number | null> | null;
  previousPeriod?: string | null;
}

export interface TrendChartProps {
  rows: readonly TrendRow[];
  series: readonly TrendSeries[];
  variant?: 'line' | 'area' | 'stackedBar';
  showPrevious?: boolean;
  ariaLabel: string;
  formatPeriod: (period: string) => string;
  emptyText?: string;
}

const MARGIN = { left: 40, right: 10, top: 10, bottom: 26 };
const LINE_INSET = 8;

/**
 * Biểu đồ xu hướng (đường / diện tích / cột chồng) vẽ bằng SVG, mọi kích thước tính từ bề rộng khung:
 * chiều cao ≈ 56% bề rộng (200–260), nhãn trục X thưa để cách nhau ≥ 40px, trục Y rút gọn "1,2K".
 * Chạm vào biểu đồ để xem số của kỳ đó; chú giải bật/tắt chuỗi (luôn giữ lại ít nhất một chuỗi);
 * "Xem bảng dữ liệu" mở đủ số liệu dạng chữ cho người dùng trình đọc màn hình.
 */
export function TrendChart({
  rows,
  series,
  variant = 'line',
  showPrevious = false,
  ariaLabel,
  formatPeriod,
  emptyText = 'Chưa có dữ liệu',
}: TrendChartProps) {
  const { colors } = useTheme();
  const [width, onLayout] = useMeasuredWidth();
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [selectedRaw, setSelected] = useState<number | null>(null);
  const [tableOpen, setTableOpen] = useState(false);

  const visible = useMemo(() => series.filter((item) => !hidden.has(item.key)), [series, hidden]);
  const n = rows.length;
  const selected = selectedRaw === null ? n - 1 : clamp(selectedRaw, 0, Math.max(0, n - 1));
  const stacked = variant === 'stackedBar';

  const toggle = (key: string) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else if (series.length - next.size > 1) next.add(key);
      return next;
    });

  const hasData =
    n > 0 && rows.some((row) => visible.some((item) => (row.values[item.key] ?? 0) > 0));
  if (n === 0 || !hasData) {
    return (
      <View style={styles.box}>
        <Text variant="secondary" tone="muted">
          {emptyText}
        </Text>
      </View>
    );
  }

  const height = trendHeight(width || 320, variant);
  const innerW = Math.max(1, width - MARGIN.left - MARGIN.right);
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const first = visible[0] as TrendSeries;

  const totals = rows.map((row) =>
    visible.reduce((sum, item) => sum + (row.values[item.key] ?? 0), 0),
  );
  const seriesMax = Math.max(
    0,
    ...rows.flatMap((row) => visible.map((item) => row.values[item.key] ?? 0)),
  );
  const previousMax =
    showPrevious && !stacked
      ? Math.max(0, ...rows.map((row) => row.previous?.[first.key] ?? 0))
      : 0;
  const top = niceMax(stacked ? Math.max(...totals) : Math.max(seriesMax, previousMax));
  const yTicks = ticks(top, 4);

  const slot = stacked ? innerW / n : n > 1 ? (innerW - LINE_INSET * 2) / (n - 1) : innerW;
  const xAt = (index: number) =>
    stacked
      ? MARGIN.left + slot * (index + 0.5)
      : n > 1
        ? MARGIN.left + LINE_INSET + slot * index
        : MARGIN.left + innerW / 2;
  const yAt = (value: number) => MARGIN.top + innerH * (1 - value / top);
  const baseY = MARGIN.top + innerH;
  const labelIndices = thinIndices(n, slot, 40);
  const barWidth = clamp(slot * 0.6, 8, 24);

  const indexFromX = (x: number) =>
    stacked
      ? Math.floor((x - MARGIN.left) / slot)
      : Math.round((x - MARGIN.left - LINE_INSET) / (slot || 1));

  const row = rows[selected] as TrendRow;
  const summary = `${ariaLabel}. ${rows
    .map(
      (item) =>
        `${formatPeriod(item.period)}: ${visible.map((s) => `${s.label} ${fmtNumber(item.values[s.key] ?? 0)}`).join(', ')}`,
    )
    .join('; ')}`;

  return (
    <View style={styles.box} onLayout={onLayout}>
      {/* Chú giải: chạm để bật/tắt chuỗi (vùng chạm ≥ 44 + hitSlop). */}
      <View style={styles.legend} accessibilityRole="radiogroup">
        {series.map((item) => {
          const off = hidden.has(item.key);
          return (
            <Pressable
              key={item.key}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !off }}
              accessibilityLabel={`${item.label}, ${off ? 'đang ẩn' : 'đang hiện'}`}
              hitSlop={{ top: 2, bottom: 2 }}
              onPress={() => toggle(item.key)}
              style={[
                styles.chip,
                {
                  borderColor: off ? colors.input : item.color,
                  backgroundColor: off ? colors.surface1 : colors.surface2,
                },
              ]}
            >
              <View
                style={[styles.dot, { backgroundColor: off ? colors.vizNeutral : item.color }]}
              />
              <Text variant="label" tone={off ? 'muted' : 'foreground'}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Số của kỳ đang chọn (mặc định kỳ cuối). */}
      <View
        style={[styles.readout, { backgroundColor: colors.surface2 }]}
        accessibilityLiveRegion="polite"
      >
        <Text variant="label">{formatPeriod(row.period)}</Text>
        {visible.map((item) => (
          <Text key={item.key} variant="secondary" tone="textSecondary">
            {item.label}: <Text variant="secondary">{fmtNumber(row.values[item.key] ?? 0)}</Text>
            {showPrevious && !stacked && item.key === first.key && row.previous
              ? ` · kỳ trước ${fmtNumber(row.previous[item.key] ?? 0)}`
              : ''}
          </Text>
        ))}
      </View>

      {width > 0 ? (
        <Pressable
          accessible
          accessibilityLabel={summary}
          onPress={(event) => setSelected(clamp(indexFromX(event.nativeEvent.locationX), 0, n - 1))}
        >
          <Svg width={width} height={height}>
            {yTicks.map((tick) => (
              <G key={tick}>
                <Line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={yAt(tick)}
                  y2={yAt(tick)}
                  stroke={colors.vizGrid}
                  strokeWidth={1}
                />
                <SvgText
                  x={MARGIN.left - 6}
                  y={yAt(tick) + 4}
                  fontSize={11}
                  fontFamily={fontFamily.regular}
                  fill={colors.vizMuted}
                  textAnchor="end"
                >
                  {formatCompact(tick)}
                </SvgText>
              </G>
            ))}
            <Line
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={baseY}
              y2={baseY}
              stroke={colors.vizAxis}
              strokeWidth={1}
            />

            {/* Đường kỳ trước (chỉ chuỗi đầu tiên đang bật). */}
            {showPrevious && !stacked
              ? splitSegments(rows.map((r) => r.previous?.[first.key] ?? null)).map((segment) => (
                  <Path
                    key={`prev-${segment.start}`}
                    d={monotonePath(
                      segment.items.map((value, i): Point => ({
                        x: xAt(segment.start + i),
                        y: yAt(value),
                      })),
                    )}
                    stroke={colors.vizAxis}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    fill="none"
                  />
                ))
              : null}

            {stacked
              ? rows.map((r, index) => {
                  let acc = 0;
                  return (
                    <G key={r.period}>
                      {visible.map((item) => {
                        const value = r.values[item.key] ?? 0;
                        if (value <= 0) return null;
                        const y1 = yAt(acc + value);
                        const h = yAt(acc) - y1;
                        acc += value;
                        return (
                          <Rect
                            key={item.key}
                            x={xAt(index) - barWidth / 2}
                            y={y1}
                            width={barWidth}
                            height={Math.max(1, h)}
                            rx={2}
                            fill={item.color}
                          />
                        );
                      })}
                    </G>
                  );
                })
              : visible.map((item) => {
                  const segments = splitSegments(rows.map((r) => r.values[item.key] ?? null));
                  return (
                    <G key={item.key}>
                      {segments.map((segment) => {
                        const pts = segment.items.map((value, i): Point => ({
                          x: xAt(segment.start + i),
                          y: yAt(value),
                        }));
                        const line = monotonePath(pts);
                        const lastPt = pts[pts.length - 1] as Point;
                        const firstPt = pts[0] as Point;
                        return (
                          <G key={segment.start}>
                            {variant === 'area' && pts.length > 1 ? (
                              <Path
                                d={`${line}L${lastPt.x},${baseY}L${firstPt.x},${baseY}Z`}
                                fill={item.color}
                                fillOpacity={0.14}
                              />
                            ) : null}
                            <Path
                              d={line}
                              stroke={item.color}
                              strokeWidth={2}
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {n <= 14
                              ? pts.map((pt, i) => (
                                  <Circle
                                    key={i}
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={3.5}
                                    fill={item.color}
                                    stroke={colors.card}
                                    strokeWidth={2}
                                  />
                                ))
                              : null}
                          </G>
                        );
                      })}
                    </G>
                  );
                })}

            {/* Vạch chỉ kỳ đang chọn. */}
            <Line
              x1={xAt(selected)}
              x2={xAt(selected)}
              y1={MARGIN.top}
              y2={baseY}
              stroke={colors.vizInk2}
              strokeWidth={1}
              strokeDasharray="3 3"
            />

            {labelIndices.map((index) => (
              <SvgText
                key={index}
                x={clamp(xAt(index), MARGIN.left + 14, width - MARGIN.right - 14)}
                y={height - 8}
                fontSize={11}
                fontFamily={fontFamily.regular}
                fill={colors.vizMuted}
                textAnchor="middle"
              >
                {formatPeriod((rows[index] as TrendRow).period)}
              </SvgText>
            ))}
          </Svg>
        </Pressable>
      ) : (
        <View style={{ height }} />
      )}

      <Button
        label="Xem bảng dữ liệu"
        variant="ghost"
        size="sm"
        fullWidth={false}
        onPress={() => setTableOpen(true)}
      />

      <BottomSheet visible={tableOpen} title={ariaLabel} onClose={() => setTableOpen(false)}>
        {rows.map((r) => (
          <View key={r.period} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
            <Text variant="bodyStrong">{formatPeriod(r.period)}</Text>
            {series.map((item) => (
              <Text key={item.key} variant="secondary" tone="textSecondary">
                {item.label}: {fmtNumber(r.values[item.key] ?? 0)}
                {showPrevious && !stacked && r.previous && item.key === series[0]?.key
                  ? ` (kỳ trước ${fmtNumber(r.previous[item.key] ?? 0)})`
                  : ''}
              </Text>
            ))}
          </View>
        ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  readout: { borderRadius: 8, padding: 10, gap: 2 },
  tableRow: { paddingVertical: 8, gap: 2, borderBottomWidth: StyleSheet.hairlineWidth },
});
