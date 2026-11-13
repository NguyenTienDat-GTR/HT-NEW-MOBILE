import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { formatDate } from '@/core/domain/date-format';

import { useTheme } from '../theme/theme-provider';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { CaretDownIcon, WarningCircleIcon } from './icons';
import { Text } from './Text';
import { TextField } from './TextField';

export interface DateFieldProps {
  label: string;
  /** yyyy-MM-dd hoặc rỗng. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  /** yyyy-MM-dd */
  minimumDate?: string;
  maximumDate?: string;
  disabled?: boolean;
  /** Cho phép xóa ngày đã chọn. */
  clearable?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function fromIso(value: string | undefined): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * Ô chọn ngày: Android mở hộp thoại hệ thống, iOS mở sheet dưới màn hình với bánh xe chọn ngày,
 * web (chỉ để xem thử) nhập tay yyyy-MM-dd. Giá trị luôn là chuỗi ISO nên gửi thẳng lên BE.
 */
export function DateField({
  label,
  value,
  onChange,
  error,
  hint,
  minimumDate,
  maximumDate,
  disabled = false,
  clearable = false,
}: DateFieldProps) {
  const { colors, radius, iconSize, touch } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(fromIso(value) ?? new Date());

  if (Platform.OS === 'web') {
    return (
      <TextField
        label={label}
        value={value}
        onChangeText={onChange}
        error={error}
        hint={hint ?? 'Nhập theo dạng năm-tháng-ngày, ví dụ 2026-11-13'}
        editable={!disabled}
      />
    );
  }

  const current = fromIso(value);
  const open = () => {
    if (disabled) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current ?? new Date(),
        mode: 'date',
        minimumDate: fromIso(minimumDate),
        maximumDate: fromIso(maximumDate),
        onValueChange: (_event, date) => onChange(toIso(date)),
      });
      return;
    }
    setDraft(current ?? new Date());
    setIosOpen(true);
  };

  return (
    <View style={styles.wrapper}>
      <Text variant="label">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current ? formatDate(value) : 'chưa chọn'}`}
        accessibilityState={{ disabled }}
        onPress={open}
        style={({ pressed }) => [
          styles.field,
          {
            minHeight: touch.input,
            borderRadius: radius.input,
            borderColor: error ? colors.danger : colors.input,
            backgroundColor: disabled
              ? colors.surface2
              : pressed
                ? colors.surface2
                : colors.surface1,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <Text variant="body" tone={current ? 'foreground' : 'muted'} style={styles.value}>
          {current ? formatDate(value) : 'Chọn ngày'}
        </Text>
        <CaretDownIcon size={iconSize.sm} color={colors.muted} weight="bold" />
      </Pressable>
      {clearable && current && !disabled ? (
        <Button
          label="Xóa ngày"
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={() => onChange('')}
        />
      ) : null}
      {error ? (
        <View style={styles.message} accessibilityLiveRegion="polite">
          <WarningCircleIcon size={iconSize.sm} color={colors.danger} weight="bold" />
          <Text variant="secondary" tone="danger" style={styles.value}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="secondary" tone="muted">
          {hint}
        </Text>
      ) : null}

      {Platform.OS === 'ios' ? (
        <BottomSheet
          visible={iosOpen}
          title={label}
          onClose={() => setIosOpen(false)}
          footer={
            <Button
              label="Chọn ngày này"
              onPress={() => {
                onChange(toIso(draft));
                setIosOpen(false);
              }}
            />
          }
        >
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            locale="vi-VN"
            minimumDate={fromIso(minimumDate)}
            maximumDate={fromIso(maximumDate)}
            onValueChange={(_event, date) => setDraft(date)}
          />
        </BottomSheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  value: { flex: 1 },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
});
