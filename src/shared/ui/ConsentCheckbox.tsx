import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { readEnv } from '@/core/config/env';

import { useTheme } from '../theme/theme-provider';

import { FieldError } from './FieldError';
import { CheckIcon } from './icons';
import { Text } from './Text';

export const PRIVACY_POLICY_LINK_LABEL = 'Chính sách bảo vệ dữ liệu cá nhân';
const CONTROLLER_NAME = 'C-LEAD';

export interface ConsentCheckboxProps {
  /**
   * self: người dùng đồng ý cho dữ liệu của chính mình. attestation: quản trị viên xác nhận người có dữ liệu đã được
   * thông báo và đồng ý khi nhập hộ (như ConsentCheckbox của web).
   */
  variant: 'self' | 'attestation';
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
}

function openPolicy() {
  try {
    void Linking.openURL(`${readEnv().siteOrigin}/chinh-sach-bao-mat`);
  } catch {
    // Thiếu cấu hình máy chủ: không có địa chỉ để mở.
  }
}

/**
 * Ô đồng ý xử lý dữ liệu cá nhân: không bao giờ tích sẵn, nêu rõ mục đích và có liên kết mở chính sách (như web).
 * Cả khối là một vùng chạm ≥ 48dp; liên kết là vùng chạm riêng để mở chính sách mà không đổi trạng thái ô tích.
 */
export function ConsentCheckbox({
  variant,
  checked,
  onChange,
  error,
  disabled = false,
}: ConsentCheckboxProps) {
  const { colors, radius } = useTheme();
  const link = (
    <Text
      variant="body"
      tone="primary"
      style={styles.link}
      accessibilityRole="link"
      onPress={openPolicy}
    >
      {PRIVACY_POLICY_LINK_LABEL}
    </Text>
  );
  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.box,
          {
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.surface2,
            borderRadius: radius.input,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked, disabled }}
          accessibilityLabel={
            variant === 'self'
              ? `Tôi đồng ý để ${CONTROLLER_NAME} xử lý dữ liệu cá nhân của tôi theo ${PRIVACY_POLICY_LINK_LABEL}`
              : `Tôi xác nhận người có thông tin đã được thông báo và đồng ý để ${CONTROLLER_NAME} xử lý dữ liệu cá nhân theo ${PRIVACY_POLICY_LINK_LABEL}`
          }
          disabled={disabled}
          onPress={() => onChange(!checked)}
          style={styles.check}
          hitSlop={4}
        >
          <View
            style={[
              styles.square,
              {
                borderColor: error ? colors.danger : checked ? colors.primary : colors.input,
                backgroundColor: checked ? colors.primary : colors.surface1,
              },
            ]}
          >
            {checked ? (
              <CheckIcon size={16} color={colors.primaryForeground} weight="bold" />
            ) : null}
          </View>
        </Pressable>
        <Text variant="body" style={styles.text} onPress={() => !disabled && onChange(!checked)}>
          {variant === 'self' ? (
            <>
              Tôi đồng ý để {CONTROLLER_NAME} xử lý họ tên, tên thánh, ngày sinh, giới tính, email,
              số điện thoại, giáo xứ và ảnh của tôi để quản lý hồ sơ huynh trưởng, đào tạo và cấp
              chứng nhận, theo {link}.
            </>
          ) : (
            <>
              Tôi xác nhận người có thông tin dưới đây đã được thông báo và đồng ý để{' '}
              {CONTROLLER_NAME} xử lý dữ liệu cá nhân của họ để quản lý hồ sơ huynh trưởng, đào tạo
              và cấp chứng nhận, theo {link}. Hệ thống ghi lại xác nhận này kèm thời điểm.
            </>
          )}
        </Text>
      </View>
      {error ? <FieldError message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  box: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, padding: 12 },
  check: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  square: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, paddingVertical: 4 },
  link: { textDecorationLine: 'underline', fontFamily: undefined },
});
