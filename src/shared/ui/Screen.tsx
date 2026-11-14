import { HeaderHeightContext } from 'expo-router/react-navigation';
import { useContext, type ComponentRef, type Ref } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useEndReached } from '../hooks/use-end-reached';
import { useTheme } from '../theme/theme-provider';

import { useScreenInsets } from './screen-insets';

export interface ScreenProps {
  children: React.ReactNode;
  /** Nút hành động dính đáy (trong vùng an toàn, nổi trên bàn phím). */
  footer?: React.ReactNode;
  /** false = không cuộn (danh sách tự có FlatList). */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Kéo xuống để tải lại (chỉ khi scroll = true). */
  onRefresh?: () => void;
  refreshing?: boolean;
  /**
   * Cuộn vô hạn: gọi khi cuộn gần cuối (hoặc nội dung chưa đầy màn hình). Hàm tự kiểm tra còn trang tiếp và
   * không đang tải; không cần nút "Tải thêm".
   */
  onEndReached?: () => void;
  /** Đang tải trang kế tiếp: hiện vòng quay ở cuối. */
  loadingMore?: boolean;
  /** Tham chiếu tới vùng cuộn (để màn hình tự cuộn tới một ô, vd. ô form báo lỗi). */
  scrollRef?: Ref<ComponentRef<typeof ScrollView>>;
  /** Báo vị trí cuộn hiện tại (dp) mỗi lần cuộn. */
  onScrollY?: (y: number) => void;
}

/**
 * Khung màn hình: vùng an toàn (tai thỏ, thanh điều hướng), tránh bàn phím, lề 16, chừa chỗ cho thanh nút dưới
 * để nội dung không bị che.
 */
export function Screen({
  children,
  footer,
  scroll = true,
  contentStyle,
  onRefresh,
  refreshing = false,
  onEndReached,
  loadingMore = false,
  scrollRef,
  onScrollY,
}: ScreenProps) {
  const endProps = useEndReached(onEndReached);
  const { colors, spacing } = useTheme();
  const insets = useScreenInsets();
  // Màn nằm dưới thanh tiêu đề thì khung bắt đầu thấp hơn mép trên màn hình đúng bằng chiều cao thanh đó; phải báo
  // cho KeyboardAvoidingView, nếu không phần đáy (nút lưu) vẫn bị bàn phím che một đoạn. Màn không có thanh tiêu đề: 0.
  const headerHeight = useContext(HeaderHeightContext) ?? 0;

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      {...endProps}
      {...(onScrollY
        ? {
            scrollEventThrottle: 16,
            onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
              onScrollY(event.nativeEvent.contentOffset.y);
              endProps.onScroll?.(event);
            },
          }
        : {})}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
      }
      contentContainerStyle={[
        styles.content,
        {
          padding: spacing.md,
          paddingTop: spacing.md + insets.top,
          // Không có nút dính đáy thì chừa chỗ cho thanh điều hướng của hệ điều hành để cuộn hết nội dung.
          paddingBottom: footer ? spacing.md : spacing.md + insets.bottom,
          gap: spacing.md,
        },
        contentStyle,
      ]}
    >
      {children}
      {loadingMore ? (
        <ActivityIndicator color={colors.primary} accessibilityLabel="Đang tải thêm" />
      ) : null}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.content,
        { paddingTop: insets.top, paddingBottom: footer ? 0 : insets.bottom },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      // Cả hai nền tảng: app Expo trên Android vẽ tràn viền (edge-to-edge) nên cửa sổ không tự co khi bàn phím mở;
      // không đặt `behavior` thì ô nhập và nút dính đáy nằm dưới bàn phím.
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
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
