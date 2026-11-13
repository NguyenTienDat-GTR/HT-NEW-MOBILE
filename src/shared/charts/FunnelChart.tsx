import { Pressable, StyleSheet, View } from 'react-native';

import { fmtNumber, fmtPercent } from '@/core/domain/number-format';

import { useTheme } from '../theme/theme-provider';
import { Text } from '../ui/Text';

export interface FunnelStepItem {
  key: string;
  label: string;
  count: number;
  rateOfPrevious: number | null;
}

export interface FunnelChartProps {
  steps: readonly FunnelStepItem[];
  onSelect?: (step: FunnelStepItem) => void;
}

/** Phễu: thanh cao 28, màu đậm dần theo bước (dải tuần tự của FE), ghi % so với bước trước và số giảm. */
export function FunnelChart({ steps, onSelect }: FunnelChartProps) {
  const { colors } = useTheme();
  const first = Math.max(1, steps[0]?.count ?? 1);
  const ramp = colors.vizSequential;

  return (
    <View style={styles.list}>
      {steps.map((step, index) => {
        const previous = steps[index - 1];
        const drop = previous ? previous.count - step.count : 0;
        const pct = Math.max(3, Math.round((step.count / first) * 100));
        const color = ramp[
          Math.min(
            ramp.length - 1,
            Math.round((index / Math.max(1, steps.length - 1)) * (ramp.length - 1)),
          )
        ] as string;
        const note = previous
          ? `${fmtPercent(step.rateOfPrevious)} so với bước trước · giảm ${fmtNumber(Math.max(0, drop))}`
          : 'Bước đầu';
        const content = (
          <View style={styles.inner}>
            <View style={styles.top}>
              <Text variant="body" style={styles.label} numberOfLines={2}>
                {step.label}
              </Text>
              <Text variant="bodyStrong">{fmtNumber(step.count)}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.surface2 }]}>
              <View style={[styles.bar, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <Text variant="secondary" tone="muted">
              {note}
            </Text>
          </View>
        );
        return onSelect ? (
          <Pressable
            key={step.key}
            accessibilityRole="button"
            accessibilityLabel={`${step.label}: ${fmtNumber(step.count)}. ${note}. Xem danh sách`}
            onPress={() => onSelect(step)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? colors.surface2 : 'transparent' },
            ]}
          >
            {content}
          </Pressable>
        ) : (
          <View
            key={step.key}
            style={styles.row}
            accessible
            accessibilityLabel={`${step.label}: ${fmtNumber(step.count)}. ${note}`}
          >
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 2 },
  row: {
    minHeight: 56,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  inner: { gap: 4 },
  top: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  label: { flex: 1 },
  track: { height: 28, borderRadius: 6, overflow: 'hidden' },
  bar: { height: 28, borderRadius: 6 },
});
