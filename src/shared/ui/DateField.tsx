import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import {
  formatDate,
  formatLocalDateTime,
  maskVnDateInput,
  parseVnDate,
  parseVnDateTime,
} from '@/core/domain/date-format';

import { useTheme } from '../theme/theme-provider';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { FieldLabel } from './FieldLabel';
import { CaretDownIcon, WarningCircleIcon } from './icons';
import { Text } from './Text';
import { TextField } from './TextField';

export interface DateFieldProps {
  label: string;
  /** yyyy-MM-dd; hoặc yyyy-MM-ddTHH:mm (giờ Việt Nam) khi `withTime`; hoặc rỗng. */
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
  /** Chọn cả giờ: Android chọn ngày rồi chọn giờ, iOS bánh xe ngày giờ. Hiển thị dd/MM/yyyy HH:mm. */
  withTime?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDateIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const toLocalIso = (date: Date) =>
  `${toDateIso(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

function fromIso(value: string | undefined): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value ?? '');
  if (!match) return undefined;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] ?? 0),
    Number(match[5] ?? 0),
  );
}

/**
 * Ô chọn ngày (và giờ): Android mở lịch hệ thống, iOS mở sheet dưới màn hình với bánh xe chọn ngày; không gõ tay.
 * Hiển thị luôn là dd/MM/yyyy (kèm HH:mm khi `withTime`). Web (chỉ để xem thử) gõ dd/MM/yyyy, tự thêm dấu "/".
 * Giá trị là chuỗi ISO nên gửi thẳng lên BE.
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
  withTime = false,
}: DateFieldProps) {
  const { colors, radius, iconSize, touch } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(fromIso(value) ?? new Date());

  if (Platform.OS === 'web') {
    return (
      <WebDateInput
        label={label}
        value={value}
        onChange={onChange}
        error={error}
        hint={hint}
        disabled={disabled}
        withTime={withTime}
      />
    );
  }

  const current = fromIso(value);
  const shown = withTime ? formatLocalDateTime(value) : formatDate(value);
  const open = () => {
    if (disabled) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current ?? new Date(),
        mode: 'date',
        // Lịch chọn ngày, không có ô gõ tay.
        display: 'calendar',
        minimumDate: fromIso(minimumDate),
        maximumDate: fromIso(maximumDate),
        onValueChange: (_event, date) => {
          if (!withTime) {
            onChange(toDateIso(date));
            return;
          }
          // Chọn ngày xong thì chọn giờ (24 giờ).
          DateTimePickerAndroid.open({
            value: current ?? date,
            mode: 'time',
            is24Hour: true,
            onValueChange: (_timeEvent, time) => {
              const merged = new Date(date);
              merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
              onChange(toLocalIso(merged));
            },
          });
        },
      });
      return;
    }
    setDraft(current ?? new Date());
    setIosOpen(true);
  };

  return (
    <View style={styles.wrapper}>
      <FieldLabel label={label} hint={hint} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown || 'chưa chọn'}`}
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
        <Text variant="body" tone={shown ? 'foreground' : 'muted'} style={styles.value}>
          {shown || (withTime ? 'Chọn ngày giờ' : 'Chọn ngày')}
        </Text>
        <CaretDownIcon size={iconSize.sm} color={colors.muted} weight="bold" />
      </Pressable>
      {clearable && current && !disabled ? (
        <Button
          label={withTime ? 'Xóa ngày giờ' : 'Xóa ngày'}
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
      ) : null}

      {Platform.OS === 'ios' ? (
        <BottomSheet
          visible={iosOpen}
          title={label}
          onClose={() => setIosOpen(false)}
          footer={
            <Button
              label={withTime ? 'Chọn ngày giờ này' : 'Chọn ngày này'}
              onPress={() => {
                onChange(withTime ? toLocalIso(draft) : toDateIso(draft));
                setIosOpen(false);
              }}
            />
          }
        >
          <DateTimePicker
            value={draft}
            mode={withTime ? 'datetime' : 'date'}
            display="spinner"
            locale="vi-VN"
            is24Hour
            minimumDate={fromIso(minimumDate)}
            maximumDate={fromIso(maximumDate)}
            onValueChange={(_event, date) => setDraft(date)}
          />
        </BottomSheet>
      ) : null}
    </View>
  );
}

/** Bản xem thử trên web: gõ dd/MM/yyyy (hoặc dd/MM/yyyy HH:mm), chỉ ghi nhận khi đủ và đúng. */
function WebDateInput({
  label,
  value,
  onChange,
  error,
  hint,
  disabled,
  withTime,
}: Pick<DateFieldProps, 'label' | 'value' | 'onChange' | 'error' | 'hint' | 'disabled'> & {
  withTime: boolean;
}) {
  const [typed, setTyped] = useState<string | null>(null);
  const format = withTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy';
  const shown = typed ?? (withTime ? formatLocalDateTime(value) : formatDate(value));
  const invalid =
    typed !== null && typed !== '' && !(withTime ? parseVnDateTime(typed) : parseVnDate(typed));
  return (
    <TextField
      label={label}
      value={shown}
      onChangeText={(text) => {
        const masked = maskVnDateInput(text, withTime);
        setTyped(masked);
        if (masked === '') {
          onChange('');
          return;
        }
        const parsed = withTime ? parseVnDateTime(masked) : parseVnDate(masked);
        if (parsed) onChange(parsed);
      }}
      onBlur={() => setTyped(null)}
      keyboardType="number-pad"
      placeholder={format}
      maxLength={withTime ? 16 : 10}
      error={error ?? (invalid ? `Nhập đúng dạng ${format}` : undefined)}
      hint={hint ?? `Nhập theo dạng ${format}`}
      editable={!disabled}
    />
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
