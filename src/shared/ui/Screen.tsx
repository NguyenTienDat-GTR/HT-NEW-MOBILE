import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/theme-provider';

export interface ScreenProps {
  children: React.ReactNode;
  /** Nút hành động dính đáy (trong vùng an toàn, nổi trên bàn phím). */
  footer?: React.ReactNode;
  /** false = không cuộn (danh sách tự có FlatList). */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Khung màn hình: vùng an toàn (tai thỏ, thanh điều hướng), tránh bàn phím, lề 16, chừa chỗ cho thanh nút dưới
 * để nội dung không bị che.
 */
export function Screen({ children, footer, scroll = true, contentStyle }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        { padding: spacing.md, paddingTop: spacing.md + insets.top, gap: spacing.md },
        contentStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { paddingTop: insets.top }, contentStyle]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.surface1,
              borderTopColor: colors.border,
              padding: spacing.md,
              paddingBottom: spacing.md + insets.bottom,
              gap: spacing.xs,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
