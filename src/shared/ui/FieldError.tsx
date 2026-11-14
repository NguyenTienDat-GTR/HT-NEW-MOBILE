import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { WarningCircleIcon } from './icons';
import { Text } from './Text';

/**
 * Dòng báo lỗi ngay dưới một ô nhập: icon cảnh báo kèm chữ (không chỉ dựa vào màu), báo cho trình đọc màn hình khi
 * xuất hiện. Dùng chung cho mọi loại ô (chữ, chọn, ngày, tích) để lỗi trông giống nhau trên cả form.
 */
export function FieldError({ message }: { message: string }) {
  const { colors, iconSize } = useTheme();
  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <WarningCircleIcon size={iconSize.sm} color={colors.danger} weight="bold" />
      <Text variant="secondary" tone="danger" style={styles.text}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  text: { flex: 1 },
});
