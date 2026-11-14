import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { Card } from './Card';
import { CaretDownIcon, CaretUpIcon } from './icons';
import { Text } from './Text';

export interface AccordionGroupProps {
  title: string;
  icon?: React.ReactNode;
  /** Số mục bên trong, hiện cạnh tiêu đề. */
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * Nhóm menu gập được, giống nhóm ở thanh bên của web: tiêu đề (biểu tượng, tên nhóm, mũi tên) cao ≥ 56dp, chạm để
 * ẩn/hiện danh sách mục bên trong.
 */
export function AccordionGroup({
  title,
  icon,
  count,
  defaultOpen = false,
  children,
}: AccordionGroupProps) {
  const { colors, iconSize } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const Caret = open ? CaretUpIcon : CaretDownIcon;
  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}${count !== undefined ? `, ${count} mục` : ''}`}
        accessibilityHint={open ? 'Chạm để thu gọn' : 'Chạm để mở rộng'}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [
          styles.header,
          {
            backgroundColor: pressed ? colors.surface2 : open ? colors.primarySoft : colors.card,
          },
        ]}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text variant="bodyStrong" tone={open ? 'primary' : 'foreground'} style={styles.title}>
          {title}
        </Text>
        {count !== undefined ? (
          <Text variant="secondary" tone="muted">
            {count}
          </Text>
        ) : null}
        <Caret size={iconSize.sm} color={colors.muted} weight="bold" />
      </Pressable>
      {open ? (
        <View style={[styles.body, { borderTopColor: colors.border }]}>{children}</View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
    gap: 12,
  },
  icon: { width: 28, alignItems: 'center' },
  title: { flex: 1 },
  body: { borderTopWidth: StyleSheet.hairlineWidth },
});
