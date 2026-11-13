import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { CaretRightIcon } from './icons';
import { Text } from './Text';

export interface ListRowProps {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  onPress: () => void;
  /** Hành động nguy hiểm (đăng xuất…): chữ màu danger. */
  destructive?: boolean;
  showChevron?: boolean;
}

/** Dòng menu cao ≥ 56dp, cả dòng là vùng chạm. */
export function ListRow({
  label,
  icon,
  hint,
  onPress,
  destructive = false,
  showChevron = true,
}: ListRowProps) {
  const { colors, iconSize } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surface2 : colors.card },
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.texts}>
        <Text variant="bodyStrong" tone={destructive ? 'danger' : 'foreground'}>
          {label}
        </Text>
        {hint ? (
          <Text variant="secondary" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
      {showChevron ? (
        <CaretRightIcon size={iconSize.sm} color={colors.muted} weight="bold" />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  icon: { width: 28, alignItems: 'center' },
  texts: { flex: 1 },
});
