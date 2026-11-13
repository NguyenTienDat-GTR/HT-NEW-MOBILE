import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/theme-provider';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  /** Bắt buộc khi có onPress: mô tả đầy đủ cho trình đọc màn hình. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Thẻ nội dung (nền trắng, viền, bo 12). Có onPress thì cả thẻ là một vùng chạm (≥ 48dp). */
export function Card({ children, onPress, accessibilityLabel, style }: CardProps) {
  const { colors, radius, spacing, touch } = useTheme();
  const base = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.panel,
    padding: spacing.md,
  };
  if (!onPress) return <View style={[styles.card, base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        base,
        { minHeight: touch.min, backgroundColor: pressed ? colors.surface2 : colors.card },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({ card: { borderWidth: 1 } });
