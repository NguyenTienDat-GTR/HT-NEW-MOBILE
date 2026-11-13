import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { Text } from './Text';

/** Chữ cái đầu (2 từ cuối của tên), giống FE initials(). */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'HT';
  if (words.length === 1) return (words[0] ?? '').slice(0, 2).toUpperCase();
  const last = words[words.length - 1] ?? '';
  const prev = words[words.length - 2] ?? '';
  return ((prev[0] ?? '') + (last[0] ?? '')).toUpperCase();
}

/** Ảnh đại diện dạng chữ cái đầu. (Ảnh thật cần header Bearer, bổ sung ở đợt sau.) */
export function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft },
      ]}
    >
      <Text variant="heading" tone="primary">
        {initialsOf(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ circle: { alignItems: 'center', justifyContent: 'center' } });
