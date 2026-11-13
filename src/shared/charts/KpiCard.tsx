import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import { Text } from '../ui/Text';

import { mixWithWhite } from './chart-math';

export type DeltaTone = 'good' | 'bad' | 'neutral';

export interface KpiCardProps {
  label: string;
  /** Giá trị đã định dạng ("1.234", "87,5%"). */
  valueText: string;
  /** Biểu tượng (đã tô màu bởi người gọi); đặt trong ô nền nhạt theo `color`. */
  icon: React.ReactNode;
  color: string;
  /** "+12%", "−3 điểm"; null nếu không so sánh. */
  deltaText?: string | null;
  deltaTone?: DeltaTone;
  /** "Hiện tại", "12 / 40"... cho chỉ số ảnh chụp. */
  footnote?: string | null;
  busy?: boolean;
}

/**
 * Thẻ chỉ số (lưới 2 cột trên điện thoại). Số tự co chữ (adjustsFontSizeToFit) nên không bao giờ bị cắt;
 * nhãn xuống tối đa 2 dòng. Sparkline của web bị ẩn dưới 640px nên không có ở đây.
 */
export function KpiCard({
  label,
  valueText,
  icon,
  color,
  deltaText,
  deltaTone = 'neutral',
  footnote,
  busy,
}: KpiCardProps) {
  const { colors, radius } = useTheme();
  const deltaColors = {
    good: { bg: colors.badge.successBg, fg: colors.badge.successFg },
    bad: { bg: colors.badge.dangerBg, fg: colors.badge.dangerFg },
    neutral: { bg: colors.surface2, fg: colors.textSecondary },
  }[deltaTone];

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${valueText}${deltaText ? `, ${deltaText} so với kỳ trước` : ''}${footnote ? `, ${footnote}` : ''}`}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.panel,
          opacity: busy ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: mixWithWhite(color, 0.14) }]}>{icon}</View>
        <Text variant="secondary" tone="textSecondary" numberOfLines={2} style={styles.label}>
          {label}
        </Text>
      </View>
      <Text variant="kpi" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {valueText}
      </Text>
      {deltaText ? (
        <View style={[styles.delta, { backgroundColor: deltaColors.bg }]}>
          <Text variant="label" style={{ color: deltaColors.fg, fontSize: 12, lineHeight: 16 }}>
            {deltaText}
          </Text>
        </View>
      ) : footnote ? (
        <Text variant="secondary" tone="muted">
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderWidth: 1, padding: 12, gap: 6, minHeight: 96, minWidth: 0 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1 },
  delta: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    minHeight: 20,
    justifyContent: 'center',
  },
});
