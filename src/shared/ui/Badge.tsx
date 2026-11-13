import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { Text } from './Text';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

/** Nhãn trạng thái. Luôn có chữ (không chỉ màu). Nền/chữ lấy từ token badge của FE. */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { badge } = useTheme().colors;
  const palette: Record<BadgeTone, [string, string]> = {
    neutral: [badge.neutralBg, badge.neutralFg],
    success: [badge.successBg, badge.successFg],
    warning: [badge.warningBg, badge.warningFg],
    danger: [badge.dangerBg, badge.dangerFg],
    info: [badge.infoBg, badge.infoFg],
  };
  const [background, foreground] = palette[tone];
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text variant="label" style={[styles.text, { color: foreground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  text: { fontSize: 12, lineHeight: 16 },
});
