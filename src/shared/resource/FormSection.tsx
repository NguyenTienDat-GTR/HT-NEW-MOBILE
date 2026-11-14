import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import { Card } from '../ui/Card';
import { CaretDownIcon, CaretUpIcon } from '../ui/icons';
import { Text } from '../ui/Text';

export interface FormSectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  /** Số ô đang báo lỗi trong nhóm: hiện cả khi nhóm đã thu gọn để người dùng biết chỗ cần sửa. */
  errorCount?: number;
  children: React.ReactNode;
}

/**
 * Một phần của form tạo/sửa: tiêu đề cao ≥ 56dp, chạm để thu gọn/mở rộng. Nhóm đang có ô lỗi hiện nhãn "n lỗi"
 * (chữ và icon, không chỉ màu). Nội dung vẫn được giữ trạng thái khi thu gọn (chỉ ẩn khỏi màn hình).
 */
export function FormSection({ title, open, onToggle, errorCount = 0, children }: FormSectionProps) {
  const { colors, iconSize, spacing } = useTheme();
  const Caret = open ? CaretUpIcon : CaretDownIcon;
  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}${errorCount > 0 ? `, ${errorCount} ô lỗi` : ''}`}
        accessibilityHint={open ? 'Chạm để thu gọn' : 'Chạm để mở rộng'}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.header,
          { backgroundColor: pressed ? colors.surface2 : colors.card },
        ]}
      >
        <Text variant="heading" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {errorCount > 0 ? (
          <Text variant="secondary" tone="danger">
            {errorCount} lỗi
          </Text>
        ) : null}
        <Caret size={iconSize.sm} color={colors.muted} weight="bold" />
      </Pressable>
      {/* Giữ nội dung đã dựng (không bỏ ô nhập) để mất focus/giá trị không xảy ra khi thu gọn. */}
      <View
        style={[
          open
            ? { gap: 12, paddingHorizontal: spacing.md, paddingBottom: spacing.md }
            : styles.collapsed,
        ]}
      >
        {children}
      </View>
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
    gap: 8,
  },
  title: { flex: 1 },
  collapsed: { display: 'none' },
});
