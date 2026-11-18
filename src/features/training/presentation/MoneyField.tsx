import { View } from 'react-native';

import type { CustomFieldProps } from '@/shared/resource/types';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import { amountFromDigits, digitsOnly, formatVndNumber, vndToWords } from '../domain/course-fee';

/**
 * Ô nhập số tiền Việt Nam đồng của form khóa (lệ phí mỗi người): hiển thị nhóm hàng nghìn (150.000), bàn phím số, và đọc
 * số tiền bằng chữ ngay dưới ô. Giá trị của form là chuỗi chữ số ("150000"); gõ / dán ký tự khác chữ số đều bị bỏ.
 */
export function MoneyField({
  value,
  onChange,
  locked,
  label,
  hint,
  required = false,
}: CustomFieldProps & { label: string; hint?: string; required?: boolean }) {
  const amount = amountFromDigits(value);
  const words = amount === null ? '' : vndToWords(amount);
  return (
    <View style={{ gap: 6 }}>
      <TextField
        label={label}
        hint={hint}
        required={required}
        value={amount === null ? '' : formatVndNumber(amount)}
        onChangeText={(next) => onChange(digitsOnly(next))}
        placeholder="0"
        keyboardType="number-pad"
        maxLength={14}
        editable={!locked}
      />
      <View accessibilityLiveRegion="polite" style={{ minHeight: 20 }}>
        {words ? (
          <Text variant="secondary" tone="textSecondary">
            {'Bằng chữ: '}
            <Text variant="secondary" tone="foreground">
              {words}
            </Text>
          </Text>
        ) : null}
      </View>
    </View>
  );
}
