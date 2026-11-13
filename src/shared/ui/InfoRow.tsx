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
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value ?? ''}`}>
      <Text variant="secondary" tone="muted">
        {label}
      </Text>
      {children ?? <Text variant="body">{value || '—'}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({ row: { gap: 2 } });
