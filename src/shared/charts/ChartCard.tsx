import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import { Text } from '../ui/Text';

export interface ChartCardProps {
  title: string;
  description?: string;
  /** Màu thanh nhấn trước tiêu đề (token viz). */
  tone?: string;
  /** Đang tải lại với bộ lọc mới: mờ nhẹ thay vì nhảy về khung trống. */
  busy?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/** Khối biểu đồ: tiêu đề + mô tả + nội dung, một cột trên điện thoại. Bo 12, viền như panel của web. */
export function ChartCard({
  title,
  description,
  tone,
  busy = false,
  actions,
  children,
}: ChartCardProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      accessibilityLabel={title}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.panel,
          padding: spacing.md,
          gap: spacing.sm,
          opacity: busy ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <View style={[styles.accent, { backgroundColor: tone ?? colors.primary }]} />
          <Text variant="heading" style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        </View>
        {actions}
      </View>
      {description ? (
        <Text variant="secondary" tone="muted">
          {description}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  accent: { width: 4, height: 16, borderRadius: 2 },
  title: { flex: 1 },
});
