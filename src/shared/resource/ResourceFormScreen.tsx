import { useState } from 'react';
import { View } from 'react-native';

import { AppError, errorMessage, fieldErrorsOf } from '@/core/domain/app-error';
import type { ResourceRow } from '@/core/resource/resource-gateway';

import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';
import { Screen } from '../ui/Screen';
import { Text } from '../ui/Text';

import { FormFieldView } from './FormFieldView';
import { applyChange, isFieldVisible, validateForm } from './form-logic';
import { useResourceGateway } from './resource-context';
import type {
  FormDefinition,
  FormMode,
  FormValues,
  PermissionSubject,
  ResourceDefinition,
} from './types';
import { rowId, useInvalidateResource, useResourceRow } from './use-resource';

export interface ResourceFormScreenProps {
  def: ResourceDefinition;
  /** Có id = sửa, không có = tạo mới. */
  id?: string;
  subject: PermissionSubject | null;
  /** Gọi sau khi lưu thành công (điều hướng quay lại). */
  onSaved: (savedId: string | null) => void;
}

/** Màn form tạo/sửa chạy theo `def.form`. Nhập liệu lớn, lỗi ngay dưới ô, nút lưu dính đáy. */
export function ResourceFormScreen({ def, id, subject, onSaved }: ResourceFormScreenProps) {
  const form = def.form;
  const query = useResourceRow(def, id);
  if (!form) return <Banner tone="danger" message="Màn hình này không hỗ trợ nhập liệu." />;
  if (id && query.isPending) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (id && query.isError) {
    return (
      <Screen>
        <Banner tone="danger" message={errorMessage(query.error)} />
      </Screen>
    );
  }
  return (
    <FormBody def={def} form={form} row={query.data ?? null} subject={subject} onSaved={onSaved} />
  );
}

function FormBody({
  def,
  form,
  row,
  subject,
  onSaved,
}: {
  def: ResourceDefinition;
  form: FormDefinition;
  row: ResourceRow | null;
  subject: PermissionSubject | null;
  onSaved: (savedId: string | null) => void;
}) {
  const mode: FormMode = row ? 'edit' : 'create';
  const gateway = useResourceGateway();
  const invalidate = useInvalidateResource(def);
  const [values, setValues] = useState<FormValues>(() => form.initialValues(row, subject));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const change = (name: string, value: string | boolean) => {
    setValues((current) => applyChange(form, current, name, value));
    setErrors((current) => {
      if (!(name in current)) return current;
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
  };

  const submit = async () => {
    setFormError(null);
    const found = validateForm(form, values, mode);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError('Vui lòng kiểm tra các ô được đánh dấu.');
      return;
    }
    setSaving(true);
    try {
      const body = form.toBody(values, mode, row, subject);
      let result: unknown;
      if (form.submit) {
        result = await form.submit({ gateway, values, mode, row, body });
      } else if (row) {
        result = await gateway.update(def.endpoint, rowId(def, row), body);
      } else {
        result = await gateway.create(def.endpoint, body);
      }
      await invalidate();
      const saved = result && typeof result === 'object' ? (result as ResourceRow) : null;
      onSaved(
        saved ? rowId(def, saved) || (row ? rowId(def, row) : null) : row ? rowId(def, row) : null,
      );
    } catch (error) {
      // Lỗi validation của BE: map theo tên trường đã gửi; còn lại hiện ở banner.
      const fromServer = fieldErrorsOf(error);
      const known = Object.fromEntries(
        Object.entries(fromServer).filter(([key]) => form.fields.some((f) => f.name === key)),
      );
      if (Object.keys(known).length > 0) setErrors(known);
      setFormError(error instanceof AppError ? error.message : errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      footer={
        <Button
          label={mode === 'create' ? 'Tạo mới' : 'Lưu thay đổi'}
          onPress={() => void submit()}
          loading={saving}
        />
      }
    >
      {formError ? <Banner tone="danger" message={formError} /> : null}
      {form.sections.map((section, index) => (
        <View key={section.title ?? index} style={{ gap: 12 }}>
          {section.title ? (
            <Text variant="heading" accessibilityRole="header">
              {section.title}
            </Text>
          ) : null}
          {section.fields.map((name) => {
            const field = form.fields.find((f) => f.name === name);
            if (!field || !isFieldVisible(field, values, mode)) return null;
            return (
              <FormFieldView
                key={name}
                field={field}
                scope={def.id}
                value={values[name] ?? (field.kind === 'switch' ? false : '')}
                values={values}
                mode={mode}
                row={row}
                subject={subject}
                error={errors[name]}
                onChange={change}
              />
            );
          })}
        </View>
      ))}
    </Screen>
  );
}
