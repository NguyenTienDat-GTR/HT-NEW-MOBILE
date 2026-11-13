import { Pressable, StyleSheet, View } from 'react-native';

import { fmtNumber } from '@/core/domain/number-format';

import { useTheme } from '../theme/theme-provider';
import { Text } from '../ui/Text';

export interface PyramidRow {
  key: string;
  label: string;
  left: number;
  right: number;
}

export interface PyramidChartProps {
  rows: readonly PyramidRow[];
  leftLabel: string;
  rightLabel: string;
  leftColor: string;
  rightColor: string;
  onSelect?: (row: PyramidRow) => void;
  emptyText?: string;
}

/**
 * Tháp dân số: bên trái / giữa (nhãn nhóm tuổi) / bên phải, cùng một thang. Co theo bề rộng bằng flex,
 * giá trị hiện ở hai đầu mỗi dòng nên luôn đọc được đủ số.
 */
export function PyramidChart({
  rows,
  leftLabel,
  rightLabel,
  leftColor,
  rightColor,
  onSelect,
  emptyText = 'Chưa có dữ liệu',
}: PyramidChartProps) {
  const { colors } = useTheme();
  const max = Math.max(0, ...rows.flatMap((row) => [row.left, row.right]));
  if (rows.length === 0 || max <= 0) {
    return (
      <Text variant="secondary" tone="muted">
        {emptyText}
      </Text>
    );
  }
  return (
    <View style={styles.box}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: leftColor }]} />
          <Text variant="label">{leftLabel}</Text>
        </View>
        <View style={styles.legendItem}>
          <Text variant="label">{rightLabel}</Text>
          <View style={[styles.swatch, { backgroundColor: rightColor }]} />
        </View>
      </View>
      {rows.map((row) => {
        const content = (
          <View style={styles.row}>
            <Text variant="secondary" style={styles.value} align="right">
              {fmtNumber(row.left)}
            </Text>
            <View style={styles.side}>
              <View
                style={[
                  styles.bar,
                  styles.leftBar,
                  { width: `${(row.left / max) * 100}%`, backgroundColor: leftColor },
                ]}
              />
            </View>
            <Text variant="label" align="center" style={styles.mid} numberOfLines={1}>
              {row.label}
            </Text>
            <View style={styles.side}>
              <View
                style={[
                  styles.bar,
                  styles.rightBar,
                  { width: `${(row.right / max) * 100}%`, backgroundColor: rightColor },
                ]}
              />
            </View>
            <Text variant="secondary" style={styles.value}>
              {fmtNumber(row.right)}
            </Text>
          </View>
        );
        const label = `${row.label}: ${leftLabel} ${fmtNumber(row.left)}, ${rightLabel} ${fmtNumber(row.right)}`;
        return onSelect ? (
          <Pressable
            key={row.key}
            accessibilityRole="button"
            accessibilityLabel={`${label}. Xem danh sách`}
            onPress={() => onSelect(row)}
            style={({ pressed }) => [
              styles.press,
              { backgroundColor: pressed ? colors.surface2 : 'transparent' },
            ]}
          >
            {content}
          </Pressable>
        ) : (
          <View key={row.key} style={styles.press} accessible accessibilityLabel={label}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 2 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  press: { minHeight: 44, borderRadius: 8, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { width: 36 },
  side: { flex: 1, height: 16, justifyContent: 'center' },
  bar: { height: 16 },
  leftBar: { alignSelf: 'flex-end', borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  rightBar: { alignSelf: 'flex-start', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  mid: { width: 56 },
});
