import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { FieldError } from './FieldError';
import { CheckIcon } from './icons';
import { Text } from './Text';

export interface CheckboxRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

/** Ô tích có hàng bấm cao ≥ 48dp (bấm cả dòng chữ, không chỉ ô vuông). */
export function CheckboxRow({ label, checked, onChange, error }: CheckboxRowProps) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        onPress={() => onChange(!checked)}
        style={({ pressed }) => [
          styles.row,
          {
            minHeight: theme.touch.min,
            backgroundColor: pressed ? colors.surface2 : 'transparent',
            borderRadius: theme.radius.input,
          },
        ]}
      >
        <View
          style={[
            styles.box,
            {
              borderColor: error ? colors.danger : checked ? colors.primary : colors.input,
              backgroundColor: checked ? colors.primary : colors.surface1,
            },
          ]}
        >
          {checked ? <CheckIcon size={16} color={colors.primaryForeground} weight="bold" /> : null}
        </View>
        <Text variant="body" style={styles.label}>
          {label}
        </Text>
      </Pressable>
      {error ? <FieldError message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1 },
});
