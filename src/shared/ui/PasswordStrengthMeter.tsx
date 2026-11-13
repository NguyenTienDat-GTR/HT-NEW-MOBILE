import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import { CheckIcon } from './icons';
import { Text } from './Text';

import { passwordStrength, strongPasswordHints } from '@/core/domain/password-rules';

/** Gợi ý mật khẩu mạnh (không bắt buộc; BE chỉ yêu cầu 8–72 ký tự). Trạng thái luôn có chữ, không chỉ màu. */
export function PasswordStrengthMeter({ value }: { value: string }) {
  const { colors } = useTheme();
  if (!value) return null;
  const strength = passwordStrength(value);
  const toneColor =
    strength.level === 1 ? colors.danger : strength.level === 2 ? colors.warning : colors.success;

  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <View style={styles.bars}>
        {[1, 2, 3].map((level) => (
          <View
            key={level}
            style={[
              styles.bar,
              { backgroundColor: level <= strength.level ? toneColor : colors.border },
            ]}
          />
        ))}
      </View>
      <Text variant="secondary" style={{ color: toneColor }}>
        Độ mạnh: {strength.label}
      </Text>
      {strongPasswordHints.map((hint) => {
        const met = hint.test(value);
        return (
          <View key={hint.id} style={styles.hint}>
            <CheckIcon size={16} color={met ? colors.success : colors.input} weight="bold" />
            <Text variant="secondary" tone={met ? 'success' : 'muted'}>
              {hint.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 6 },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 6, borderRadius: 3 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
