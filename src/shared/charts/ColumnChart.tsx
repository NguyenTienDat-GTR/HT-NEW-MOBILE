import { StyleSheet, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { fmtNumber } from '@/core/domain/number-format';

import { useTheme } from '../theme/theme-provider';
import { fontFamily } from '../theme/tokens';
import { Text } from '../ui/Text';

import { clamp } from './chart-math';
import { useMeasuredWidth } from './use-measured-width';

export interface ColumnItem {
  key: string;
  label: string;
  value: number;
  color?: string;
}

export interface ColumnChartProps {
  items: readonly ColumnItem[];
  color: string;
  ariaLabel: string;
  emptyText?: string;
}

const HEIGHT = 168;
const TOP = 18;
const BOTTOM = 24;

/**
 * Cột đứng. Bề rộng cột tính từ bề rộng khung; số trên đầu cột chỉ hiện khi đủ chỗ (cột ≥ 18px),
 * còn lại số liệu vẫn có trong nhãn trợ năng. Nhãn trục X thưa dần khi cột hẹp.
 */
export function ColumnChart({
  items,
  color,
  ariaLabel,
  emptyText = 'Chưa có dữ liệu',
}: ColumnChartProps) {
  const { colors } = useTheme();
  const [width, onLayout] = useMeasuredWidth();
  const max = Math.max(0, ...items.map((item) => item.value));

  if (items.length === 0 || max <= 0) {
    return (
      <Text variant="secondary" tone="muted">
        {emptyText}
      </Text>
    );
  }
  const slot = width > 0 ? width / items.length : 0;
  const barWidth = clamp(slot * 0.64, 6, 30);
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const showValues = slot >= 24;
  const labelEvery = Math.max(1, Math.ceil(28 / Math.max(slot, 1)));
  const summary = `${ariaLabel}. ${items.map((item) => `${item.label}: ${fmtNumber(item.value)}`).join('; ')}`;

  return (
    <View onLayout={onLayout} accessible accessibilityLabel={summary}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {[0.25, 0.5, 0.75, 1].map((fraction) => (
            <Line
              key={fraction}
              x1={0}
              x2={width}
              y1={TOP + plotHeight * (1 - fraction)}
              y2={TOP + plotHeight * (1 - fraction)}
              stroke={colors.vizGrid}
              strokeWidth={1}
            />
          ))}
          {items.map((item, index) => {
            const h = Math.max(item.value > 0 ? 2 : 0, (item.value / max) * plotHeight);
            const x = index * slot + (slot - barWidth) / 2;
            const y = TOP + plotHeight - h;
            return (
              <G key={item.key}>
                <Rect x={x} y={y} width={barWidth} height={h} rx={4} fill={item.color ?? color} />
                {showValues && item.value > 0 ? (
                  <SvgText
                    x={x + barWidth / 2}
                    y={y - 4}
                    fontSize={11}
                    fontFamily={fontFamily.semibold}
                    fill={colors.vizInk2}
                    textAnchor="middle"
                  >
                    {fmtNumber(item.value)}
                  </SvgText>
                ) : null}
                {index % labelEvery === 0 ? (
                  <SvgText
                    x={x + barWidth / 2}
                    y={HEIGHT - 6}
                    fontSize={11}
                    fontFamily={fontFamily.regular}
                    fill={colors.vizMuted}
                    textAnchor="middle"
                  >
                    {item.label}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
        </Svg>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ placeholder: { height: HEIGHT } });
