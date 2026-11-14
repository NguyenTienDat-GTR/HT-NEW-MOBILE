import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { QrCodeIcon } from './icons';
import { Text } from './Text';

export interface ScanTabButtonProps {
  onPress?: ((event: GestureResponderEvent) => void) | null;
  onLongPress?: ((event: GestureResponderEvent) => void) | null;
  accessibilityState?: { selected?: boolean };
  testID?: string;
}

/**
 * Nút quét QR nổi ở giữa thanh tab dưới: vòng tròn đặc 56dp nhô lên khỏi thanh để nổi bật hơn các tab thường; chọn
 * thì mở tab quét (camera bật ngay). Có nhãn chữ bên dưới như các tab khác.
 */
export function ScanTabButton({
  onPress,
  onLongPress,
  accessibilityState,
  testID,
}: ScanTabButtonProps) {
  const { colors, iconSize } = useTheme();
  const selected = accessibilityState?.selected === true;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel="Quét mã QR"
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress ?? undefined}
      onLongPress={onLongPress ?? undefined}
      style={styles.slot}
    >
      {({ pressed }) => (
        <View style={styles.inner}>
          <View
            style={[
              styles.circle,
              {
                backgroundColor: pressed || selected ? colors.primaryHover : colors.primary,
                borderColor: colors.surface1,
                shadowColor: colors.foreground,
              },
            ]}
          >
            <QrCodeIcon size={iconSize.lg} color={colors.onSolid} weight="bold" />
          </View>
          <Text variant="label" tone={selected ? 'primary' : 'muted'} style={styles.label}>
            Quét QR
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  inner: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    marginTop: -22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  label: { fontSize: 12, lineHeight: 16 },
});
