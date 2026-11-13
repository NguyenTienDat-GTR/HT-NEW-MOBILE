import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { InfoIcon, WarningCircleIcon } from './icons';
import { Text } from './Text';

export interface BannerProps {
  tone: 'danger' | 'info' | 'warning';
  message: string;
}

/** Thông báo trong trang (lỗi chung, hướng dẫn). Có icon và chữ, không dựa vào màu. */
export function Banner({ tone, message }: BannerProps) {
  const { colors, iconSize, radius } = useTheme();
  const palette = {
    danger: { bg: colors.badge.dangerBg, fg: colors.badge.dangerFg },
    warning: { bg: colors.badge.warningBg, fg: colors.badge.warningFg },
    info: { bg: colors.badge.infoBg, fg: colors.badge.infoFg },
  }[tone];
  const Icon = tone === 'info' ? InfoIcon : WarningCircleIcon;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.box, { backgroundColor: palette.bg, borderRadius: radius.panel }]}
    >
      <Icon size={iconSize.md} color={palette.fg} weight="bold" />
      <Text variant="secondary" style={[styles.text, { color: palette.fg }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  text: { flex: 1 },
});
