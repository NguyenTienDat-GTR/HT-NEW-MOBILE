import { useRef, useState, type ComponentRef, type RefObject } from 'react';
import { ScrollView, View } from 'react-native';

import { AppError, errorMessage, fieldErrorsOf } from '@/core/domain/app-error';
import type { ResourceRow } from '@/core/resource/resource-gateway';

import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';
import { Screen } from '../ui/Screen';
import type { TextInputHandle } from '../ui/TextField';

import { FormFieldView } from './FormFieldView';
import { FormSection } from './FormSection';
import {
  applyChange,
  firstFormError,
  groupFormRows,
  isCompactField,
  sectionErrorCounts,
  validateForm,
  visibleFields,
} from './form-logic';
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
  const [openSections, setOpenSections] = useState<boolean[]>(() => form.sections.map(() => true));
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollY = useRef(0);
  // Sổ đăng ký ô -> nút giao diện / ô nhập (đối tượng cố định, không đọc ref khi dựng giao diện).
  const [registry] = useState(() => ({
    nodes: new Map<string, ComponentRef<typeof View> | null>(),
    slotRefs: new Map<string, (node: ComponentRef<typeof View> | null) => void>(),
    inputs: new Map<string, RefObject<TextInputHandle | null>>(),
  }));

  const slotRef = (name: string) => {
    let ref = registry.slotRefs.get(name);
    if (!ref) {
      ref = (node) => {
        registry.nodes.set(name, node);
      };
      registry.slotRefs.set(name, ref);
    }
    return ref;
  };
  const inputRef = (name: string) => {
    let ref = registry.inputs.get(name);
    if (!ref) {
      ref = { current: null };
      registry.inputs.set(name, ref);
    }
    return ref;
  };

  /** Mở các nhóm đang có lỗi, cuộn tới ô lỗi đầu tiên rồi focus vào ô đó (nếu là ô nhập chữ). */
  const revealFirstError = (found: Record<string, string>) => {
    const first = firstFormError(form, found);
    if (!first) return;
    const counts = sectionErrorCounts(form, found);
    setOpenSections((current) => current.map((open, index) => open || (counts[index] ?? 0) > 0));
    // Chờ nhóm vừa mở dựng xong rồi mới đo vị trí.
    setTimeout(() => {
      const node = registry.nodes.get(first.name);
      const scroller = scrollRef.current;
      node?.measureInWindow((_x, y) => {
        scroller?.measureInWindow((_sx, sy) => {
          scroller.scrollTo({ y: Math.max(0, scrollY.current + (y - sy) - 16), animated: true });
        });
      });
      registry.inputs.get(first.name)?.current?.focus();
    }, 150);
  };

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
      revealFirstError(found);
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
      if (Object.keys(known).length > 0) {
        setErrors(known);
        revealFirstError(known);
      }
      setFormError(error instanceof AppError ? error.message : errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const errorCounts = sectionErrorCounts(form, errors);

  return (
    <Screen
      scrollRef={scrollRef}
      onScrollY={(y) => {
        scrollY.current = y;
      }}
      footer={
        <Button
          label={mode === 'create' ? 'Tạo mới' : 'Lưu thay đổi'}
          onPress={() => void submit()}
          loading={saving}
        />
      }
    >
      {formError ? <Banner tone="danger" message={formError} /> : null}
      {form.sections.map((section, index) => {
        const rows = groupFormRows(visibleFields(form, section.fields, values, mode)).map(
          (fields) => {
            const views = fields.map((field) => (
              <FormFieldView
                key={field.name}
                field={field}
                scope={def.id}
                value={values[field.name] ?? (field.kind === 'switch' ? false : '')}
                values={values}
                mode={mode}
                row={row}
                subject={subject}
                error={errors[field.name]}
                inputRef={inputRef(field.name)}
                onChange={change}
              />
            ));
            // Mỗi ô nằm trong một "slot" để đo vị trí khi cần cuộn tới ô báo lỗi.
            const slot = (position: number, flex?: boolean) => (
              <View
                key={fields[position]!.name}
                ref={slotRef(fields[position]!.name)}
                collapsable={false}
                style={flex ? { flex: 1 } : undefined}
              >
                {views[position]}
              </View>
            );
            // Hai ô ngắn chung một hàng; ô ngắn lẻ nửa hàng; ô khác một hàng riêng.
            return fields.length === 2 ? (
              <View key={fields[0]!.name} style={{ flexDirection: 'row', gap: 12 }}>
                {slot(0, true)}
                {slot(1, true)}
              </View>
            ) : isCompactField(fields[0]!) ? (
              <View key={fields[0]!.name} style={{ flexDirection: 'row', gap: 12 }}>
                {slot(0, true)}
                <View style={{ flex: 1 }} />
              </View>
            ) : (
              slot(0)
            );
          },
        );
        return section.title ? (
          <FormSection
            key={section.title}
            title={section.title}
            open={openSections[index] ?? true}
            errorCount={errorCounts[index]}
            onToggle={() =>
              setOpenSections((current) =>
                current.map((open, position) => (position === index ? !open : open)),
              )
            }
          >
            {rows}
          </FormSection>
        ) : (
          <View key={index} style={{ gap: 12 }}>
            {rows}
          </View>
        );
      })}
    </Screen>
  );
}
