import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import type { ColorTokens, TextVariant } from '../theme/tokens';

type ToneName =
  | 'foreground'
  | 'textSecondary'
  | 'muted'
  | 'primary'
  | 'danger'
  | 'success'
  | 'warning'
  | 'onSolid';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: ToneName;
  align?: 'left' | 'center' | 'right';
}

export function Text({ variant = 'body', tone = 'foreground', align, style, ...rest }: TextProps) {
  const theme = useTheme();
  const token = theme.typography[variant];
  const color: ColorTokens[ToneName] = theme.colors[tone];
  return (
    <RNText
      // Cho phép cỡ chữ hệ thống lớn: không khóa chiều cao, chữ xuống dòng thay vì bị cắt.
      allowFontScaling
      maxFontSizeMultiplier={1.6}
      style={[
        {
          fontFamily: token.fontFamily,
          fontSize: token.fontSize,
          lineHeight: token.lineHeight,
          color,
          textAlign: align,
          fontVariant: variant === 'kpi' ? ['tabular-nums'] : undefined,
        },
        style,
      ]}
      {...rest}
    />
  );
}
