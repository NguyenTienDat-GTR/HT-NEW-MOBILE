import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { fmtNumber, fmtPercent } from '@/core/domain/number-format';

import { useTheme } from '../theme/theme-provider';
import { Text } from '../ui/Text';

import { donutDiameter, mergeSmallest } from './chart-math';
import { useMeasuredWidth } from './use-measured-width';

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  segments: readonly DonutSegment[];
  /** Chữ nhỏ dưới tổng ở giữa vòng ("Huynh trưởng"). */
  centerLabel: string;
  onSelect?: (segment: DonutSegment) => void;
  /** Màu cho lát "Khác" khi gộp (tối đa 6 lát). */
  otherColor: string;
  emptyText?: string;
}

const MAX_SEGMENTS = 6;
const GAP = 0.014;

/**
 * Donut: đường kính = min(132, 40% bề rộng khung); chú giải nằm dưới (tên, số, %) và là vùng chạm ≥ 48dp.
 * Quá 6 lát thì gộp phần nhỏ nhất thành "Khác" để nhãn không chồng.
 */
export function DonutChart({
  segments,
  centerLabel,
  onSelect,
  otherColor,
  emptyText = 'Chưa có dữ liệu',
}: DonutChartProps) {
  const { colors } = useTheme();
  const [width, onLayout] = useMeasuredWidth();
  const positive = segments.filter((segment) => segment.value > 0);
  const total = positive.reduce((sum, segment) => sum + segment.value, 0);

  if (total <= 0) {
    return (
      <Text variant="secondary" tone="muted">
        {emptyText}
      </Text>
    );
  }
  const shown = mergeSmallest(positive, MAX_SEGMENTS, (value): DonutSegment => ({
    key: '__other',
    label: 'Khác',
    value,
    color: otherColor,
  }));
  const size = donutDiameter(width || 320);
  const stroke = Math.max(14, Math.round(size * 0.17));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View onLayout={onLayout} style={styles.box}>
      <View
        style={styles.chart}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width={size} height={size}>
          <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.surface2}
              strokeWidth={stroke}
              fill="none"
            />
            {shown.map((segment, index) => {
              const fraction = segment.value / total;
              // Điểm bắt đầu của lát = tổng các lát trước (tính thuần, không gán lại biến trong lúc render).
              const offset =
                (shown.slice(0, index).reduce((sum, item) => sum + item.value, 0) / total) *
                circumference;
              const length = Math.max(0, fraction - (shown.length > 1 ? GAP : 0)) * circumference;
              return (
                <Circle
                  key={segment.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={segment.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                />
              );
            })}
          </G>
        </Svg>
        <View style={[styles.center, { width: size, height: size }]} pointerEvents="none">
          <Text variant="kpi" adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.6}>
            {fmtNumber(total)}
          </Text>
          <Text
            variant="secondary"
            tone="muted"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{ fontSize: 12, lineHeight: 16 }}
          >
            {centerLabel}
          </Text>
        </View>
      </View>

      <View style={styles.legend}>
        {shown.map((segment) => {
          const text = `${fmtNumber(segment.value)} · ${fmtPercent((segment.value / total) * 100)}`;
          const row = (
            <View style={styles.legendRow}>
              <View style={[styles.swatch, { backgroundColor: segment.color }]} />
              <Text variant="body" style={styles.legendLabel} numberOfLines={2}>
                {segment.label}
              </Text>
              <Text variant="bodyStrong">{text}</Text>
            </View>
          );
          const selectable = onSelect && segment.key !== '__other';
          return selectable ? (
            <Pressable
              key={segment.key}
              accessibilityRole="button"
              accessibilityLabel={`${segment.label}: ${text}. Xem danh sách`}
              onPress={() => onSelect(segment)}
              style={({ pressed }) => [
                styles.legendItem,
                { backgroundColor: pressed ? colors.surface2 : 'transparent' },
              ]}
            >
              {row}
            </Pressable>
          ) : (
            <View
              key={segment.key}
              style={styles.legendItem}
              accessible
              accessibilityLabel={`${segment.label}: ${text}`}
            >
              {row}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12 },
  chart: { alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  legend: { gap: 2 },
  legendItem: { minHeight: 48, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { flex: 1 },
});
