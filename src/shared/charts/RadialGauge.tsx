import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { fmtPercent } from '@/core/domain/number-format';

import { useTheme } from '../theme/theme-provider';
import { Text } from '../ui/Text';

import { clamp, gaugeDiameter } from './chart-math';
import { useMeasuredWidth } from './use-measured-width';

export interface GaugeItem {
  key: string;
  label: string;
  /** Phần trăm 0–100; null = chưa có số. */
  value: number | null;
  color: string;
  hint?: string;
}

/**
 * Hàng đồng hồ tỷ lệ (tối đa 3 một hàng). Đường kính tính từ bề rộng khung nên 3 cái luôn vừa một hàng ở 320dp.
 */
export function GaugeRow({ items }: { items: readonly GaugeItem[] }) {
  const { colors } = useTheme();
  const [width, onLayout] = useMeasuredWidth();
  const perRow = Math.min(3, Math.max(1, items.length));
  const size = gaugeDiameter(width || 320, perRow);
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View onLayout={onLayout} style={styles.row}>
      {items.map((item) => {
        const fraction = clamp((item.value ?? 0) / 100, 0, 1);
        return (
          <View
            key={item.key}
            style={styles.cell}
            accessible
            accessibilityLabel={`${item.label}: ${fmtPercent(item.value)}${item.hint ? `, ${item.hint}` : ''}`}
          >
            <View>
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
                  <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={item.color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${fraction * circumference} ${circumference}`}
                  />
                </G>
              </Svg>
              <View style={[styles.center, { width: size, height: size }]} pointerEvents="none">
                <Text
                  variant="heading"
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  minimumFontScale={0.6}
                >
                  {fmtPercent(item.value)}
                </Text>
              </View>
            </View>
            <Text variant="secondary" tone="textSecondary" align="center" numberOfLines={2}>
              {item.label}
            </Text>
            {item.hint ? (
              <Text variant="secondary" tone="muted" align="center">
                {item.hint}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cell: { flex: 1, alignItems: 'center', gap: 4 },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
