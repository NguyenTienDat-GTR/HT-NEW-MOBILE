import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ResourceRow } from '@/core/resource/resource-gateway';

import { DateField } from '../ui/DateField';
import { SelectField } from '../ui/SelectField';
import { SwitchRow } from '../ui/SwitchRow';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';

import { todayIso } from './form-logic';
import type { FormFieldDef, FormMode, FormValues, PermissionSubject } from './types';
import { LookupField } from './LookupField';
import { useOptions } from './use-resource';

export interface FormFieldViewProps {
  field: FormFieldDef;
  /** Định danh tài nguyên, dùng làm phạm vi cache của danh sách lựa chọn. */
  scope: string;
  value: string | boolean;
  values: FormValues;
  mode: FormMode;
  row: ResourceRow | null;
  subject: PermissionSubject | null;
  error?: string;
  onChange: (name: string, value: string | boolean) => void;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: `Tháng ${i + 1}`,
}));
const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: `Ngày ${i + 1}`,
}));

function SelectView({
  field,
  scope,
  value,
  values,
  mode,
  row,
  subject,
  onChange,
}: FormFieldViewProps) {
  const { options, loading } = useOptions(
    field.options,
    { values, mode, row, subject },
    `${scope}:${field.name}`,
  );
  return (
    <SelectField
      label={field.label}
      value={String(value)}
      options={options}
      placeholder={loading ? 'Đang tải…' : (field.placeholder ?? 'Chọn')}
      allowClear={!field.required}
      disabled={field.lockedOnEdit && mode === 'edit'}
      onChange={(next) => onChange(field.name, next)}
    />
  );
}

/** Ô "ngày-tháng không kèm năm" (ngày bổn mạng): chọn tháng và ngày bằng hai ô chọn, giá trị "MM-dd". */
function DayMonthView({ field, value, onChange, mode }: FormFieldViewProps) {
  const [month = '', day = ''] = String(value).split('-');
  const locked = field.lockedOnEdit && mode === 'edit';
  // Giữ cả khi mới chọn một nửa ("03-") để không mất lựa chọn; validate báo thiếu cho tới khi đủ ngày và tháng.
  const set = (m: string, d: string) => onChange(field.name, m || d ? `${m}-${d}` : '');
  return (
    <View style={styles.dayMonth}>
      <View style={styles.half}>
        <SelectField
          label={`${field.label} (ngày)`}
          value={day}
          options={DAYS}
          disabled={locked}
          onChange={(d) => set(month, d)}
        />
      </View>
      <View style={styles.half}>
        <SelectField
          label={`${field.label} (tháng)`}
          value={month}
          options={MONTHS}
          disabled={locked}
          onChange={(m) => set(m, day)}
        />
      </View>
    </View>
  );
}

function FormFieldViewBase(props: FormFieldViewProps) {
  const { field, value, error, mode, onChange } = props;
  const locked = field.lockedOnEdit && mode === 'edit';

  switch (field.kind) {
    case 'select':
      return (
        <View style={styles.block}>
          <SelectView {...props} />
          {error ? <ErrorText message={error} /> : null}
        </View>
      );
    case 'lookup':
      return (
        <View style={styles.block}>
          <LookupField
            field={field}
            scope={props.scope}
            value={String(value)}
            disabled={locked}
            onChange={(next) => onChange(field.name, next)}
          />
          {error ? <ErrorText message={error} /> : null}
        </View>
      );
    case 'daymonth':
      return (
        <View style={styles.block}>
          <DayMonthView {...props} />
          {error ? <ErrorText message={error} /> : null}
        </View>
      );
    case 'date':
      return (
        <DateField
          label={field.label}
          value={String(value)}
          onChange={(next) => onChange(field.name, next)}
          error={error}
          hint={field.hint}
          disabled={locked}
          maximumDate={field.maxDate === 'today' ? todayIso() : field.maxDate}
          minimumDate={field.minDate}
          clearable={!field.required}
        />
      );
    case 'switch':
      return (
        <View style={styles.block}>
          <SwitchRow
            label={field.label}
            hint={field.hint}
            value={Boolean(value)}
            disabled={locked}
            onChange={(next) => onChange(field.name, next)}
          />
          {error ? <ErrorText message={error} /> : null}
        </View>
      );
    default:
      return (
        <TextField
          label={field.label}
          value={String(value)}
          onChangeText={(next) => onChange(field.name, next)}
          error={error}
          hint={field.hint}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          editable={!locked}
          multiline={field.kind === 'multiline'}
          keyboardType={
            field.kind === 'email'
              ? 'email-address'
              : field.kind === 'phone'
                ? 'phone-pad'
                : (field.keyboardType ?? 'default')
          }
          autoCapitalize={field.kind === 'email' ? 'none' : 'sentences'}
          autoComplete={
            field.kind === 'email' ? 'email' : field.kind === 'phone' ? 'tel' : undefined
          }
        />
      );
  }
}

function ErrorText({ message }: { message: string }) {
  return (
    <Text variant="secondary" tone="danger" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

export const FormFieldView = memo(FormFieldViewBase);

const styles = StyleSheet.create({
  block: { gap: 4 },
  dayMonth: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
});
