import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme/theme-provider';
import { CheckIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

export interface FeeCheckRowProps {
  /** Tên người, chỉ để trình đọc màn hình đọc đủ ngữ cảnh ("Đã đóng lệ phí: Nguyễn An"). */
  person: string;
  checked: boolean;
  /** Đang chờ lưu: hiện mờ nhẹ, vẫn bấm được (đổi ý trong lúc lưu chỉ gửi trạng thái cuối). */
  busy?: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * Ô "Đã đóng tiền" trên thẻ người tham dự: cả hàng cao ≥ 48dp, chạm là đổi ngay và tự lưu (không báo thành công, lỗi thì
 * trả về như cũ). Dùng chung với nút điểm danh trên một hàng thao tác.
 */
export function FeeCheckRow({ person, checked, busy = false, onChange }: FeeCheckRowProps) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, busy }}
      accessibilityLabel={`Đã đóng lệ phí: ${person}`}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: theme.touch.buttonSm,
          borderRadius: theme.radius.input,
          borderColor: checked ? colors.primary : colors.input,
          backgroundColor: pressed ? colors.surface2 : colors.surface1,
          opacity: busy ? 0.6 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? colors.primary : colors.input,
            backgroundColor: checked ? colors.primary : colors.surface1,
          },
        ]}
      >
        {checked ? <CheckIcon size={16} color={colors.primaryForeground} weight="bold" /> : null}
      </View>
      <Text variant="bodyStrong" numberOfLines={1} style={styles.label}>
        Đã đóng tiền
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flexShrink: 1 },
});
