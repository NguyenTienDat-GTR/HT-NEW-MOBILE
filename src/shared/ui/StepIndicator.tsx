import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { Text } from './Text';

export interface StepIndicatorProps {
  labels: readonly string[];
  /** Chỉ số bước hiện tại, từ 0. */
  current: number;
}

/** Thanh tiến độ nhiều bước. Báo "Bước x/n" bằng chữ cho trình đọc màn hình, không chỉ bằng màu. */
export function StepIndicator({ labels, current }: StepIndicatorProps) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Bước ${current + 1} trên ${labels.length}: ${labels[current] ?? ''}`}
    >
      <View style={styles.bars}>
        {labels.map((label, index) => (
          <View
            key={label}
            style={[
              styles.bar,
              { backgroundColor: index <= current ? colors.primary : colors.border },
            ]}
          />
        ))}
      </View>
      <Text variant="secondary" tone="muted" style={styles.caption}>
        Bước {current + 1}/{labels.length} · {labels[current]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 6, borderRadius: 3 },
  caption: { marginTop: 6 },
});
