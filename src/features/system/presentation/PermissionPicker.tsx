import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useResourceGateway } from '@/shared/resource/resource-context';
import type { CustomFieldProps } from '@/shared/resource/types';
import { Button } from '@/shared/ui/Button';
import { CheckboxRow } from '@/shared/ui/CheckboxRow';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import {
  filterPermissions,
  groupPermissions,
  parseSelection,
  permissionLabel,
  stringifySelection,
  toggleCode,
  toggleGroup,
  type PermissionItem,
} from '../domain/permission-grants';

export type PickerSource = {
  /** Đường dẫn danh sách quyền (chưa gán hoặc đã gán). */
  path: string;
  /** Tên tham số định danh đối tượng (roleCode hoặc username). */
  param: 'roleCode' | 'username';
  /** Tên trường của form chứa giá trị đối tượng đã chọn. */
  field: string;
  label: string;
  emptyText: string;
  needTargetText: string;
};

/**
 * Chọn nhiều quyền từ danh sách của một vai trò hoặc tài khoản (tải sau khi đã chọn đối tượng). Danh sách dài nên chia
 * nhóm theo phân hệ + đối tượng (thu gọn sẵn), có ô tìm và nút tích cả nhóm.
 */
export function PermissionPicker({
  source,
  value,
  values,
  onChange,
}: CustomFieldProps & { source: PickerSource }) {
  const gateway = useResourceGateway();
  const target = String(values[source.field] ?? '');
  const [term, setTerm] = useState('');
  const list = useQuery({
    queryKey: ['permission-picker', source.path, target],
    enabled: target !== '',
    queryFn: () =>
      gateway.call<PermissionItem[]>('GET', source.path, { query: { [source.param]: target } }),
  });
  const selected = parseSelection(value);
  const items = useMemo(() => list.data ?? [], [list.data]);
  const groups = useMemo(() => groupPermissions(filterPermissions(items, term)), [items, term]);
  const set = (codes: string[]) => onChange(stringifySelection(codes));

  return (
    <View style={{ gap: 8 }}>
      <Text variant="label">{source.label}</Text>
      {target === '' ? (
        <Text variant="secondary" tone="muted">
          {source.needTargetText}
        </Text>
      ) : list.isPending ? (
        <Text variant="secondary" tone="muted">
          Đang tải danh sách quyền…
        </Text>
      ) : items.length === 0 ? (
        <Text variant="secondary" tone="muted">
          {source.emptyText}
        </Text>
      ) : (
        <>
          <TextField
            label="Tìm quyền"
            value={term}
            onChangeText={setTerm}
            placeholder="Tên quyền, đối tượng hoặc thao tác"
            autoCapitalize="none"
          />
          <Text variant="secondary" tone="muted">
            {`Đã chọn ${selected.length}/${items.length} quyền.`}
          </Text>
          {groups.length === 0 ? (
            <Text variant="secondary" tone="muted">
              Không có quyền nào khớp từ khóa.
            </Text>
          ) : null}
          {groups.map((group) => {
            const codes = group.items.map((item) => item.permissionCode);
            const picked = codes.filter((code) => selected.includes(code)).length;
            return (
              <CollapsibleSection
                key={group.key}
                title={`${group.label} · ${picked}/${codes.length}`}
                defaultOpen={term.trim() !== ''}
              >
                <Button
                  label={picked === codes.length ? 'Bỏ chọn cả nhóm' : 'Chọn cả nhóm'}
                  variant="outline"
                  size="sm"
                  onPress={() => set(toggleGroup(selected, codes))}
                />
                {group.items.map((item) => (
                  <CheckboxRow
                    key={item.permissionCode}
                    label={permissionLabel(item)}
                    checked={selected.includes(item.permissionCode)}
                    onChange={() => set(toggleCode(selected, item.permissionCode))}
                  />
                ))}
              </CollapsibleSection>
            );
          })}
        </>
      )}
    </View>
  );
}
