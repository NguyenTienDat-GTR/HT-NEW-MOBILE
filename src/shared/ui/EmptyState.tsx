import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Trạng thái rỗng/lỗi: icon, tiêu đề, gợi ý hướng dẫn hành động tiếp theo. */
export function EmptyState({ icon, title, hint, actionLabel, onAction }: EmptyStateProps) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.box, { padding: spacing.lg, gap: spacing.sm }]}>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>{icon}</View>
      ) : null}
      <Text variant="heading" align="center">
        {title}
      </Text>
      {hint ? (
        <Text variant="secondary" tone="muted" align="center">
          {hint}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="outline"
          size="sm"
          fullWidth={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
