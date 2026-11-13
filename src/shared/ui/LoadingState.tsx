import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { Text } from './Text';

export function LoadingState({ label = 'Đang tải…' }: { label?: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={[styles.box, { padding: spacing.lg, gap: spacing.sm }]}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator color={colors.primary} />
      <Text variant="secondary" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ box: { alignItems: 'center', justifyContent: 'center' } });
