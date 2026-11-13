import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '../hooks/use-reduce-motion';
import { useTheme } from '../theme/theme-provider';

import { XIcon } from './icons';
import { Text } from './Text';

export interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Thanh nút dưới cùng (nằm ngoài vùng cuộn, trong vùng an toàn). */
  footer?: React.ReactNode;
}

/**
 * Sheet từ đáy màn hình dựa trên Modal gốc (nút Back của Android đóng sheet).
 * Chạm nền hoặc nút ✕ (48×48) để đóng.
 */
export function BottomSheet({ visible, title, onClose, children, footer }: BottomSheetProps) {
  const { colors, radius, spacing, iconSize } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Đóng"
          accessibilityRole="button"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface1,
              borderTopLeftRadius: radius.panel + 4,
              borderTopRightRadius: radius.panel + 4,
              paddingBottom: spacing.md + insets.bottom,
            },
          ]}
        >
          <View
            style={[styles.header, { borderBottomColor: colors.border, paddingLeft: spacing.md }]}
          >
            <Text
              variant="heading"
              style={styles.title}
              numberOfLines={2}
              accessibilityRole="header"
            >
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              onPress={onClose}
              style={({ pressed }) => [
                styles.close,
                { backgroundColor: pressed ? colors.surface2 : 'transparent' },
              ]}
            >
              <XIcon size={iconSize.md} color={colors.muted} weight="bold" />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? (
            <View style={{ paddingHorizontal: spacing.md, gap: spacing.xs }}>{footer}</View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, paddingVertical: 12 },
  close: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
});
