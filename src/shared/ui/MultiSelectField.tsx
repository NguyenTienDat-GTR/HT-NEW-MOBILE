import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { CheckboxRow } from './CheckboxRow';
import { FieldError } from './FieldError';
import { FieldLabel } from './FieldLabel';
import { CaretDownIcon } from './icons';
import type { SelectOption } from './SelectField';
import { Text } from './Text';
import { TextField } from './TextField';

export interface MultiSelectFieldProps {
  label: string;
  value: readonly string[];
  options: readonly SelectOption[];
  onChange: (value: string[]) => void;
  /** Chữ hiện khi chưa chọn mục nào. */
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

const SEARCH_THRESHOLD = 8;

/**
 * Ô chọn nhiều giá trị (như ô multiselect của web): chạm mở sheet dưới màn hình với danh sách ô tích cao ≥ 48dp, có ô
 * tìm kiếm khi nhiều lựa chọn, nút "Bỏ chọn tất cả" và "Xong". Ô hiển thị tóm tắt các mục đã chọn.
 */
export function MultiSelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Chọn',
  hint,
  error,
  required = false,
  disabled = false,
  loading = false,
}: MultiSelectFieldProps) {
  const { colors, radius, iconSize, touch } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const chosen = useMemo(() => new Set(value), [value]);
  const labelOf = useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? options.filter((option) => option.label.toLowerCase().includes(needle))
      : options;
  }, [options, query]);

  const toggle = (code: string) => {
    const next = new Set(chosen);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange([...next]);
  };

  const names = value.map((code) => labelOf.get(code) ?? code);
  const summary =
    names.length === 0
      ? loading
        ? 'Đang tải…'
        : placeholder
      : names.length <= 2
        ? names.join(', ')
        : `${names.slice(0, 2).join(', ')} và ${names.length - 2} mục khác`;

  return (
    <View style={styles.wrapper}>
      <FieldLabel label={label} hint={hint} required={required} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}${required ? ', bắt buộc' : ''}: ${names.length === 0 ? 'chưa chọn' : `đã chọn ${names.length}`}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          {
            minHeight: touch.input,
            borderRadius: radius.input,
            borderColor: error ? colors.danger : colors.input,
            backgroundColor: disabled || pressed ? colors.surface2 : colors.surface1,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <Text
          variant="body"
          tone={names.length > 0 ? 'foreground' : 'muted'}
          style={styles.value}
          numberOfLines={2}
        >
          {summary}
        </Text>
        <CaretDownIcon size={iconSize.sm} color={colors.muted} weight="bold" />
      </Pressable>
      {error ? <FieldError message={error} /> : null}

      <BottomSheet
        visible={open}
        title={label}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button label={`Xong (${value.length} đã chọn)`} onPress={() => setOpen(false)} />
            {value.length > 0 ? (
              <Button
                label="Bỏ chọn tất cả"
                variant="ghost"
                size="sm"
                onPress={() => onChange([])}
              />
            ) : null}
          </>
        }
      >
        {options.length > SEARCH_THRESHOLD ? (
          <TextField
            label="Tìm kiếm"
            value={query}
            onChangeText={setQuery}
            placeholder="Gõ để lọc danh sách"
          />
        ) : null}
        {filtered.map((option) => (
          <CheckboxRow
            key={option.value}
            label={option.label}
            checked={chosen.has(option.value)}
            onChange={() => toggle(option.value)}
          />
        ))}
        {filtered.length === 0 ? (
          <Text variant="secondary" tone="muted">
            Không có dữ liệu phù hợp
          </Text>
        ) : null}
      </BottomSheet>
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
    paddingVertical: 8,
  },
  value: { flex: 1 },
});
