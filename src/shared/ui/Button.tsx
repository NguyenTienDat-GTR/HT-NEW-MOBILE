import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Nút chính (52) hoặc nút phụ (48). Cả hai đều ≥ 48dp. */
  size?: 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  /** Mặc định rộng hết bề ngang: dễ bấm trên điện thoại. */
  fullWidth?: boolean;
  icon?: React.ReactNode;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  icon,
  accessibilityHint,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const { colors } = theme;
  const inactive = disabled || loading;

  const palette = {
    primary: {
      bg: colors.primary,
      pressed: colors.primaryHover,
      fg: colors.primaryForeground,
      border: colors.primary,
    },
    secondary: {
      bg: colors.primarySoft,
      pressed: colors.surface2,
      fg: colors.primary,
      border: colors.primarySoft,
    },
    outline: {
      bg: colors.surface1,
      pressed: colors.surface2,
      fg: colors.foreground,
      border: colors.input,
    },
    ghost: {
      bg: 'transparent',
      pressed: colors.surface2,
      fg: colors.primary,
      border: 'transparent',
    },
    destructive: {
      bg: colors.danger,
      pressed: colors.dangerPressed,
      fg: colors.onSolid,
      border: colors.danger,
    },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: size === 'md' ? theme.touch.button : theme.touch.buttonSm,
          borderRadius: theme.radius.button,
          backgroundColor: pressed ? palette.pressed : palette.bg,
          borderColor: palette.border,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          // Không dùng transform khi nhấn: tránh nhảy bố cục. Nút khóa chỉ mờ đi.
          opacity: disabled && !loading ? 0.5 : 1,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={palette.fg} /> : icon}
        <Text variant="bodyStrong" style={{ color: palette.fg }} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
