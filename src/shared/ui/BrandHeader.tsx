import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from './Text';

export const BRAND_NAME = 'C-LEAD';
export const BRAND_TAGLINE_EN = 'Leaders, To Serve';
export const BRAND_TAGLINE_VI = 'Huynh Trưởng, Phụng Sự';

const logo = require('../../../assets/icon.png');

/** Logo + tên + khẩu hiệu (đồng bộ FE/src/components/brand/brand-mark.tsx). */
export function BrandHeader({ compact = false }: { compact?: boolean }) {
  const size = compact ? 56 : 88;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${BRAND_NAME}. ${BRAND_TAGLINE_VI}`}>
      <Image
        source={logo}
        style={{ width: size, height: size, borderRadius: 16 }}
        contentFit="contain"
      />
      <View style={styles.texts}>
        <Text variant="title" tone="primary">
          {BRAND_NAME}
        </Text>
        <Text variant="label">{BRAND_TAGLINE_EN}</Text>
        <Text variant="secondary" tone="muted">
          {BRAND_TAGLINE_VI}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  texts: { flex: 1 },
});
