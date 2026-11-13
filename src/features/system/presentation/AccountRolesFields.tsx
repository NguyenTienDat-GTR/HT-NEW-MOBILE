import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import type { ResourceRow } from '@/core/resource/resource-gateway';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { text } from '@/shared/resource/row';
import type { CustomFieldProps } from '@/shared/resource/types';
import { Text } from '@/shared/ui/Text';

import {
  EMPTY_ROLE_CHOICE,
  MAX_ACCOUNT_ROLES,
  parseRoleChoice,
  stringifyRoleChoice,
} from '../domain/account-create';

import { RoleChecklist, type RoleOption } from './RoleChecklist';

/** Ô chọn vai trò khi tạo tài khoản: tích tối đa 3 vai trò và chọn một vai trò chính. */
export function AccountRolesField({ value, values, onChange, locked }: CustomFieldProps) {
  const gateway = useResourceGateway();
  const excluded = String(values.excludedRoles ?? '')
    .split(',')
    .filter(Boolean);
  const roles = useQuery({
    queryKey: ['system-role-options'],
    queryFn: () => gateway.list('/system/roles', { page: 0, size: 100, status: true }),
    staleTime: 5 * 60_000,
  });
  const options: RoleOption[] = (roles.data?.content ?? [])
    .filter((row) => !excluded.includes(text(row, 'roleCode')))
    .map((row) => ({ value: text(row, 'roleCode'), label: text(row, 'roleName') }));

  return (
    <View style={{ gap: 8 }}>
      <Text variant="label">Vai trò</Text>
      <Text variant="secondary" tone="muted">
        {`Tích vai trò cần gán (tối đa ${MAX_ACCOUNT_ROLES}) rồi chọn một vai trò chính.`}
      </Text>
      <RoleChecklist
        options={options}
        choice={parseRoleChoice(value)}
        onChange={locked ? () => undefined : (choice) => onChange(stringifyRoleChoice(choice))}
        showPrimary
        loading={roles.isPending}
      />
    </View>
  );
}

interface AssignableRole extends ResourceRow {
  roleCode?: string;
  roleName?: string;
  assigned?: boolean;
}

/**
 * Ô chọn vai trò khi gán thêm cho một tài khoản: chỉ tải sau khi đã chọn tài khoản; vai trò đã gán hiện sẵn đã tích và
 * không đổi được; tổng số vai trò của tài khoản tối đa 3.
 */
export function AssignRolesField({ value, values, onChange }: CustomFieldProps) {
  const gateway = useResourceGateway();
  const username = String(values.username ?? '');
  const roles = useQuery({
    queryKey: ['system-assignable-roles', username],
    enabled: username !== '',
    queryFn: () =>
      gateway.call<AssignableRole[]>('GET', '/system/account-roles/assignable-roles', {
        query: { username, includeAssigned: 'true' },
      }),
  });
  const list = roles.data ?? [];
  const assignedCount = list.filter((role) => role.assigned === true).length;
  const options: RoleOption[] = list.map((role) => ({
    value: String(role.roleCode ?? ''),
    label: String(role.roleName ?? ''),
    assigned: role.assigned === true,
  }));

  return (
    <View style={{ gap: 8 }}>
      <Text variant="label">Vai trò cần gán</Text>
      {username === '' ? (
        <Text variant="secondary" tone="muted">
          Chọn tài khoản trước để tải danh sách vai trò.
        </Text>
      ) : (
        <RoleChecklist
          options={options}
          choice={{ ...EMPTY_ROLE_CHOICE, ...parseRoleChoice(value) }}
          onChange={(choice) => onChange(stringifyRoleChoice(choice))}
          showPrimary={false}
          maxNew={Math.max(0, MAX_ACCOUNT_ROLES - assignedCount)}
          loading={roles.isPending}
          emptyText="Tài khoản này không còn vai trò nào để gán thêm."
        />
      )}
    </View>
  );
}
