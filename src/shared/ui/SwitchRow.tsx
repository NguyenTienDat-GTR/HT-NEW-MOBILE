import { StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { Text } from './Text';

export interface SwitchRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
  disabled?: boolean;
}

/** Công tắc bật/tắt có nhãn bên cạnh; cả hàng cao ≥ 56dp. */
export function SwitchRow({ label, value, onChange, hint, disabled = false }: SwitchRowProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="secondary" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: colors.input, true: colors.primary }}
        thumbColor={colors.surface1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  texts: { flex: 1, gap: 2 },
});
