import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';

import { useDebouncedValue } from '../hooks/use-debounced-value';
import { useTheme } from '../theme/theme-provider';
import { Banner } from '../ui/Banner';
import { BottomSheet } from '../ui/BottomSheet';
import { FieldLabel } from '../ui/FieldLabel';
import { CaretDownIcon, CheckIcon } from '../ui/icons';
import { LoadingState } from '../ui/LoadingState';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';

import { useResourceGateway } from './resource-context';
import type { FormFieldDef, SelectOption } from './types';

export interface LookupFieldProps {
  field: FormFieldDef;
  scope: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/**
 * Chọn một bản ghi trong danh sách rất dài (huynh trưởng): mở sheet, gõ để tìm trên máy chủ (đợi người dùng
 * ngừng gõ rồi mới gọi), chạm một dòng để chọn. Nhãn của lựa chọn được giữ lại để hiển thị sau khi đóng sheet.
 */
export function LookupField({ field, scope, value, disabled = false, onChange }: LookupFieldProps) {
  const { colors, radius, iconSize, touch } = useTheme();
  const gateway = useResourceGateway();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [picked, setPicked] = useState<SelectOption | null>(null);
  const debounced = useDebouncedValue(term.trim());

  const results = useQuery({
    queryKey: ['resource-lookup', scope, field.name, debounced],
    queryFn: () => (field.lookup as NonNullable<typeof field.lookup>).search(gateway, debounced),
    enabled: open && Boolean(field.lookup),
    staleTime: 60_000,
  });

  const label = value && picked?.value === value ? picked.label : '';
  const choose = (option: SelectOption) => {
    setPicked(option);
    onChange(option.value);
    setOpen(false);
    setTerm('');
  };

  return (
    <View style={styles.wrapper}>
      <FieldLabel label={field.label} hint={field.hint} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${field.label}: ${label || 'Chưa chọn'}`}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          {
            minHeight: touch.input,
            borderRadius: radius.input,
            borderColor: colors.input,
            backgroundColor: pressed ? colors.surface2 : colors.surface1,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <Text
          variant="body"
          tone={label ? 'foreground' : 'muted'}
          style={styles.value}
          numberOfLines={1}
        >
          {label || (field.placeholder ?? 'Chạm để tìm và chọn')}
        </Text>
        <CaretDownIcon size={iconSize.sm} color={colors.muted} weight="bold" />
      </Pressable>

      <BottomSheet visible={open} title={field.label} onClose={() => setOpen(false)}>
        <TextField
          label="Tìm kiếm"
          value={term}
          onChangeText={setTerm}
          placeholder={field.lookup?.placeholder ?? 'Gõ tên, email, số điện thoại…'}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {results.isPending ? <LoadingState label="Đang tìm…" /> : null}
        {results.isError ? <Banner tone="danger" message={errorMessage(results.error)} /> : null}
        {(results.data ?? []).map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => choose(option)}
              style={[styles.option, { minHeight: 52, borderColor: colors.border }]}
            >
              <Text variant="body" style={styles.value}>
                {option.label}
              </Text>
              {selected ? (
                <CheckIcon size={iconSize.md} color={colors.primary} weight="bold" />
              ) : null}
            </Pressable>
          );
        })}
        {results.data && results.data.length === 0 ? (
          <Text variant="secondary" tone="muted">
            Không tìm thấy kết quả phù hợp.
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
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  value: { flex: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
});
