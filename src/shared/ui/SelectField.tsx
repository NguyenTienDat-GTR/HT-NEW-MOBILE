import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { BottomSheet } from './BottomSheet';
import { FieldError } from './FieldError';
import { FieldLabel } from './FieldLabel';
import { CaretDownIcon, CheckIcon } from './icons';
import { Text } from './Text';
import { TextField } from './TextField';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  /** Chữ hiện khi chưa chọn (và là lựa chọn xóa chọn đầu danh sách). */
  placeholder?: string;
  /** false = không có lựa chọn "bỏ chọn". */
  allowClear?: boolean;
  disabled?: boolean;
  /** Hướng dẫn hiện sau dấu "?" cạnh nhãn. */
  hint?: string;
  /** Lỗi hiện ngay dưới ô (viền đỏ, icon và chữ). */
  error?: string;
  /** Ô bắt buộc: nhãn có dấu "*". */
  required?: boolean;
}

const SEARCH_THRESHOLD = 8;

/**
 * Ô chọn một giá trị: chạm mở sheet dưới màn hình với danh sách dòng cao 52dp (dễ bấm hơn menu thả xuống nhỏ);
 * nhiều lựa chọn thì có ô tìm kiếm.
 */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Tất cả',
  allowClear = true,
  disabled = false,
  hint,
  error,
  required = false,
}: SelectFieldProps) {
  const { colors, radius, iconSize, touch } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? options.filter((option) => option.label.toLowerCase().includes(needle))
      : options;
  }, [options, query]);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.wrapper}>
      <FieldLabel label={label} hint={hint} required={required} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}${required ? ', bắt buộc' : ''}: ${selected?.label ?? placeholder}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
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
        <Text
          variant="body"
          tone={selected ? 'foreground' : 'muted'}
          style={styles.value}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <CaretDownIcon size={iconSize.sm} color={colors.muted} weight="bold" />
      </Pressable>
      {error ? <FieldError message={error} /> : null}

      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        {options.length > SEARCH_THRESHOLD ? (
          <TextField
            label="Tìm kiếm"
            value={query}
            onChangeText={setQuery}
            placeholder="Gõ để lọc danh sách"
          />
        ) : null}
        {allowClear ? (
          <OptionRow label={placeholder} selected={value === ''} onPress={() => choose('')} />
        ) : null}
        {filtered.map((option) => (
          <OptionRow
            key={option.value}
            label={option.label}
            selected={option.value === value}
            onPress={() => choose(option.value)}
          />
        ))}
        {filtered.length === 0 ? (
          <Text variant="secondary" tone="muted">
            Không có lựa chọn phù hợp.
          </Text>
        ) : null}
      </BottomSheet>
    </View>
  );
}

function OptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, iconSize } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected
            ? colors.primarySoft
            : pressed
              ? colors.surface2
              : 'transparent',
        },
      ]}
    >
      <Text
        variant={selected ? 'bodyStrong' : 'body'}
        tone={selected ? 'primary' : 'foreground'}
        style={styles.value}
      >
        {label}
      </Text>
      {selected ? <CheckIcon size={iconSize.md} color={colors.primary} weight="bold" /> : null}
    </Pressable>
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
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
