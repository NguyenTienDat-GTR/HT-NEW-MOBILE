import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { QuestionIcon } from './icons';
import { Text, type TextProps } from './Text';

export interface FieldLabelProps {
  label: string;
  /** Hướng dẫn của ô: hiện sau dấu "?" cạnh nhãn (như HelpTip của web), không chiếm chỗ dưới ô nhập. */
  hint?: string;
  variant?: TextProps['variant'];
}

/**
 * Nhãn của ô nhập kèm dấu "?" nhỏ: chạm để mở/đóng khung hướng dẫn ngay dưới nhãn. Dấu "?" nhìn 24dp nhưng vùng chạm
 * mở rộng đủ 48dp; nút có nhãn đọc được và báo trạng thái mở/đóng cho trình đọc màn hình.
 */
export function FieldLabel({ label, hint, variant = 'label' }: FieldLabelProps) {
  const { colors, radius } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Text variant={variant} style={styles.label}>
          {label}
        </Text>
        {hint ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem hướng dẫn: ${label}`}
            accessibilityState={{ expanded: open }}
            hitSlop={12}
            onPress={() => setOpen((value) => !value)}
            style={[styles.icon, { backgroundColor: open ? colors.primarySoft : colors.surface2 }]}
          >
            <QuestionIcon size={16} color={open ? colors.primary : colors.muted} weight="bold" />
          </Pressable>
        ) : null}
      </View>
      {hint && open ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.bubble,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.border,
              borderRadius: radius.input,
            },
          ]}
        >
          <Text variant="secondary" tone="textSecondary">
            {hint}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flexShrink: 1 },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 8 },
});
