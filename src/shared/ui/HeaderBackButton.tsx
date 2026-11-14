import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { ArrowLeftIcon } from './icons';

/**
 * Nút quay lại ở thanh tiêu đề: vòng tròn nền xanh nhạt, mũi tên đậm màu chữ chính để luôn nổi trên nền thanh tiêu đề
 * (mũi tên mặc định của hệ điều hành có thể trùng màu nền). Vùng chạm 44dp, kèm vùng chạm mở rộng.
 */
export function HeaderBackButton() {
  const router = useRouter();
  const { colors, iconSize } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quay lại"
      hitSlop={6}
      onPress={() => router.back()}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        backgroundColor: pressed ? colors.border : colors.primarySoft,
      })}
    >
      <ArrowLeftIcon size={iconSize.md} color={colors.foreground} weight="bold" />
    </Pressable>
  );
}
