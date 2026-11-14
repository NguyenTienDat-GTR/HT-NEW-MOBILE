import { StyleSheet, View } from 'react-native';

import { Text } from './Text';

/** Một dòng "nhãn: giá trị" (nhãn nhỏ phía trên, giá trị xuống dòng thoải mái, không cắt chữ). */
export function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <View
      style={styles.row}
      accessible
      // Có nội dung riêng (nhãn trạng thái, nhiều dòng…) thì để trình đọc màn hình tự ghép chữ bên trong, không đọc
      // "nhãn:" rồi bỏ mất giá trị.
      accessibilityLabel={children ? undefined : `${label}: ${value || 'chưa có'}`}
    >
      <Text variant="secondary" tone="muted">
        {label}
      </Text>
      {children ?? <Text variant="body">{value || '—'}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({ row: { gap: 2 } });
