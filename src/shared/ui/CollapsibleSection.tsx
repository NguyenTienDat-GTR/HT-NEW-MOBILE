import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { CaretDownIcon, CaretUpIcon } from './icons';
import { Text } from './Text';

export interface CollapsibleSectionProps {
  title: string;
  /** Số lượng hiển thị cạnh tiêu đề (vd. "(3)"). */
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** Nhóm thông tin thu gọn được: tiêu đề cao ≥ 48dp, nội dung chỉ hiện khi mở (giảm phải vuốt/cuộn). */
export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const { colors, iconSize, spacing } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const Caret = open ? CaretUpIcon : CaretDownIcon;
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}${count !== undefined ? `, ${count} mục` : ''}`}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [
          styles.header,
          { backgroundColor: pressed ? colors.surface2 : 'transparent' },
        ]}
      >
        <Text variant="bodyStrong" style={styles.title}>
          {title}
          {count !== undefined ? ` (${count})` : ''}
        </Text>
        <Caret size={iconSize.sm} color={colors.muted} weight="bold" />
      </Pressable>
      {open ? <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 8 },
  title: { flex: 1 },
});
