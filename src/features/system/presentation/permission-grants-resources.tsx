import { formatDate, formatDateTime } from '@/core/domain/date-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { loadOptions } from '@/shared/resource/options';
import { joinParts, text } from '@/shared/resource/row';
import type {
  DetailSection,
  FormFieldDef,
  ListFilterDef,
  ResourceDefinition,
  SelectOption,
} from '@/shared/resource/types';

import { vnDate } from '../domain/account-role-body';
import {
  buildAccountGrantBody,
  buildAccountGrantUpdateBody,
  buildRoleGrantBody,
  buildRoleGrantUpdateBody,
  canEditAccountPermissionRow,
  canEditRolePermissionRow,
  canManageAccountPermissions,
  canAssignRolePermissions,
  canRevokeAccountPermissionRow,
  canRevokeRolePermissionRow,
  parseSelection,
  revocationReasonText,
  validityLabel,
} from '../domain/permission-grants';
import type { SystemSubject } from '../domain/system-permissions';

import { PermissionPicker, type PickerSource } from './PermissionPicker';
import { RevokeGrantAction } from './RevokeGrantAction';
import { taxonomyFilters } from './taxonomy-filters';

const validityBadges = (row: ResourceRow) => {
  const validity = validityLabel(row.validity);
  return validity ? [{ label: validity.label, tone: validity.tone }] : [];
};

const expiryLine = (row: ResourceRow) =>
  text(row, 'expiresAt')
    ? `Hết hạn ${formatDate(text(row, 'expiresAt'))}`
    : 'Không giới hạn thời gian';

const historySection: (row: ResourceRow) => DetailSection = (row) => ({
  title: 'Lịch sử ghi nhận',
  collapsed: true,
  fields: [
    { label: 'Người tạo', value: text(row, 'createdByName') },
    { label: 'Ngày tạo', value: formatDateTime(text(row, 'createdAt')) },
    { label: 'Người cập nhật', value: text(row, 'updatedByName') },
    { label: 'Ngày cập nhật', value: formatDateTime(text(row, 'updatedAt')) },
  ],
});

const revocationFields = (row: ResourceRow) => [
  { label: 'Ngày thu hồi', value: formatDateTime(text(row, 'revokedAt')) },
  { label: 'Người thu hồi', value: text(row, 'revokedByName') || text(row, 'revokedBy') },
  { label: 'Lý do thu hồi', value: revocationReasonText(row.revocationReason) },
];

const expiryField = (row: ResourceRow) => ({
  label: 'Hết hạn',
  value: text(row, 'expiresAt') ? formatDateTime(text(row, 'expiresAt')) : 'Không giới hạn',
});

const permissionSearch = [
  'permission.permissionCode',
  'permission.permissionName',
  'permission.module.moduleCode',
  'permission.resource.resourceCode',
  'permission.action.actionCode',
  'permission.scope.scopeCode',
];

const expiresField: FormFieldDef = {
  name: 'expiresAt',
  label: 'Ngày hết hạn',
  kind: 'date',
  hint: 'Để trống nếu không giới hạn. Quyền hết hạn sẽ tự bị thu hồi.',
};

const hideOnCreate = (_values: unknown, mode: 'create' | 'edit') => mode === 'edit';
const onlyCreate = (_values: unknown, mode: 'create' | 'edit') => mode === 'create';

// ---- Phân quyền cho vai trò ----

const ROLE_PICKER: PickerSource = {
  path: '/system/role-permissions/assignable-permissions',
  param: 'roleCode',
  field: 'roleCode',
  label: 'Quyền chưa gán',
  emptyText: 'Vai trò này đã có đủ các quyền bạn được phân.',
  needTargetText: 'Chọn vai trò trước để chỉ hiện các quyền chưa gán cho vai trò đó.',
};

/** Phân quyền vai trò: danh sách, phân nhiều quyền cho một vai trò, sửa hạn, thu hồi từng quyền. */
export const rolePermissionsResource: ResourceDefinition = {
  id: 'role-permissions',
  title: 'Phân quyền vai trò',
  singular: 'Quyền của vai trò',
  createLabel: 'Phân quyền',
  endpoint: '/system/role-permissions',
  idField: 'id',
  searchFields: ['role.roleCode', 'role.roleName', ...permissionSearch],
  searchPlaceholder: 'Vai trò hoặc quyền',
  filters: [
    {
      key: 'role.roleCode',
      label: 'Vai trò',
      options: {
        load: ({ gateway }) =>
          loadOptions(gateway, '/system/roles', { value: 'roleCode', label: 'roleName' }),
      },
    } satisfies ListFilterDef,
    ...taxonomyFilters('permission.'),
  ],
  card: (row) => ({
    title: text(row, 'permissionName') || text(row, 'permissionCode'),
    subtitle: text(row, 'roleName'),
    lines: [expiryLine(row)],
    badges: validityBadges(row),
  }),
  detailTitle: (row) => text(row, 'permissionName') || text(row, 'permissionCode'),
  detailBadges: validityBadges,
  detail: (row) => [
    {
      title: 'Quyền của vai trò',
      fields: [
        { label: 'Vai trò', value: text(row, 'roleName') },
        { label: 'Quyền', value: text(row, 'permissionName') },
        { label: 'Mã quyền', value: text(row, 'permissionCode') },
        { label: 'Tình trạng quyền', value: validityLabel(row.validity)?.label ?? '' },
        { label: 'Điều kiện áp dụng', value: text(row, 'conditions') },
      ],
    },
    {
      title: 'Thời hạn và thu hồi',
      fields: [
        { label: 'Người gán', value: text(row, 'assignedByName') || text(row, 'assignedBy') },
        { label: 'Ngày gán', value: formatDateTime(text(row, 'assignedAt')) },
        expiryField(row),
        ...revocationFields(row),
      ],
    },
    historySection(row),
  ],
  renderDetailExtra: ({ row, subject }) => (
    <RevokeGrantAction
      row={row}
      resourceId="role-permissions"
      visible={canRevokeRolePermissionRow(subject as SystemSubject | null, row)}
      target={{
        endpoint: '/system/role-permissions',
        param: 'roleCode',
        subject: `vai trò ${text(row, 'roleName') || text(row, 'roleCode')}`,
      }}
    />
  ),
  form: {
    titleCreate: 'Phân quyền cho vai trò',
    titleEdit: 'Chỉnh sửa quyền của vai trò',
    sections: [
      { title: 'Vai trò', fields: ['roleCode', 'roleView', 'permissionView'] },
      { title: 'Quyền', fields: ['permissions'] },
      { title: 'Thời hạn', fields: ['expiresAt'] },
    ],
    fields: [
      {
        name: 'roleCode',
        label: 'Vai trò',
        kind: 'select',
        required: true,
        visible: onlyCreate,
        resets: ['permissions'],
        options: {
          // BE đã lọc vai trò cấp cao hơn và ngoài phân cấp của người phân quyền.
          load: async ({ gateway }) => {
            const roles = await gateway.call<ResourceRow[]>(
              'GET',
              '/system/role-permissions/manageable-roles',
              { query: { action: 'assign' } },
            );
            return roles.map<SelectOption>((role) => ({
              value: text(role, 'roleCode'),
              label: text(role, 'roleName'),
            }));
          },
        },
      },
      {
        name: 'roleView',
        label: 'Vai trò',
        kind: 'text',
        lockedOnEdit: true,
        visible: hideOnCreate,
      },
      {
        name: 'permissionView',
        label: 'Quyền',
        kind: 'text',
        lockedOnEdit: true,
        visible: hideOnCreate,
      },
      {
        name: 'permissions',
        label: 'Quyền chưa gán',
        kind: 'custom',
        visible: onlyCreate,
        validate: (value) =>
          parseSelection(String(value)).length > 0 ? null : 'Chọn ít nhất một quyền',
        render: (props) => <PermissionPicker source={ROLE_PICKER} {...props} />,
      },
      expiresField,
    ],
    initialValues: (row) => ({
      roleCode: '',
      permissions: '',
      roleView: row ? text(row, 'roleName') : '',
      permissionView: row ? text(row, 'permissionName') : '',
      expiresAt: row ? vnDate(text(row, 'expiresAt')) : '',
    }),
    toBody: (values, mode) =>
      mode === 'create'
        ? buildRoleGrantBody({
            roleCode: String(values.roleCode ?? ''),
            permissionCodes: parseSelection(String(values.permissions ?? '')),
            expiresAt: String(values.expiresAt ?? ''),
          })
        : buildRoleGrantUpdateBody(String(values.expiresAt ?? '')),
    submit: ({ gateway, mode, row, body }) =>
      mode === 'create'
        ? gateway.call('POST', '/system/role-permissions/bulk', { body })
        : gateway.update('/system/role-permissions', text(row ?? {}, 'id'), body),
    successCreate: 'Phân quyền thành công',
    successEdit: 'Lưu cập nhật thành công',
  },
  canCreate: (subject) => canAssignRolePermissions(subject as SystemSubject | null),
  canUpdate: (subject, row) => canEditRolePermissionRow(subject as SystemSubject | null, row),
  canToggle: () => false,
};

// ---- Phân quyền cho tài khoản ----

const ACCOUNT_PICKER: PickerSource = {
  path: '/system/account-permissions/assignable-permissions',
  param: 'username',
  field: 'username',
  label: 'Quyền chưa gán',
  emptyText: 'Tài khoản này đã có đủ các quyền bạn được phân.',
  needTargetText: 'Chọn tài khoản trước để chỉ hiện các quyền chưa gán cho tài khoản đó.',
};

/** Phân quyền tài khoản: quyền gán riêng cho một tài khoản (kèm lý do), sửa lý do/hạn, thu hồi từng quyền. */
export const accountPermissionsResource: ResourceDefinition = {
  id: 'account-permissions',
  title: 'Phân quyền tài khoản',
  singular: 'Quyền của tài khoản',
  createLabel: 'Phân quyền',
  endpoint: '/system/account-permissions',
  idField: 'id',
  searchFields: ['account.username', ...permissionSearch, 'reason'],
  searchPlaceholder: 'Tài khoản, quyền hoặc lý do',
  filters: [
    {
      key: 'account.username',
      label: 'Tài khoản',
      options: {
        load: async ({ gateway }) => {
          const accounts = await gateway.call<ResourceRow[]>(
            'GET',
            '/system/accounts/permission-targets',
          );
          return accounts.map<SelectOption>((account) => ({
            value: text(account, 'username'),
            label: text(account, 'username'),
          }));
        },
      },
    } satisfies ListFilterDef,
    ...taxonomyFilters('permission.'),
  ],
  card: (row) => ({
    title: text(row, 'permissionName') || text(row, 'permissionCode'),
    subtitle: joinParts([text(row, 'username'), text(row, 'leaderFullName')]),
    lines: [expiryLine(row)],
    badges: validityBadges(row),
  }),
  detailTitle: (row) => text(row, 'permissionName') || text(row, 'permissionCode'),
  detailBadges: validityBadges,
  detail: (row) => [
    {
      title: 'Quyền của tài khoản',
      fields: [
        { label: 'Tài khoản', value: text(row, 'username') },
        { label: 'Huynh trưởng', value: text(row, 'leaderFullName') },
        { label: 'Quyền', value: text(row, 'permissionName') },
        { label: 'Mã quyền', value: text(row, 'permissionCode') },
        { label: 'Tình trạng quyền', value: validityLabel(row.validity)?.label ?? '' },
        { label: 'Lý do cấp', value: text(row, 'reason') },
      ],
    },
    {
      title: 'Thời hạn và thu hồi',
      fields: [expiryField(row), ...revocationFields(row)],
    },
    historySection(row),
  ],
  renderDetailExtra: ({ row, subject }) => (
    <RevokeGrantAction
      row={row}
      resourceId="account-permissions"
      visible={canRevokeAccountPermissionRow(subject as SystemSubject | null, row)}
      target={{
        endpoint: '/system/account-permissions',
        param: 'username',
        subject: `tài khoản ${text(row, 'username')}`,
      }}
    />
  ),
  form: {
    titleCreate: 'Phân quyền cho tài khoản',
    titleEdit: 'Chỉnh sửa quyền của tài khoản',
    sections: [
      { title: 'Tài khoản', fields: ['username', 'accountView', 'permissionView'] },
      { title: 'Quyền', fields: ['permissions'] },
      { title: 'Lý do và thời hạn', fields: ['reason', 'expiresAt'] },
    ],
    fields: [
      {
        name: 'username',
        label: 'Tài khoản',
        kind: 'lookup',
        required: true,
        visible: onlyCreate,
        resets: ['permissions'],
        lookup: {
          placeholder: 'Gõ tên đăng nhập, tên huynh trưởng, vai trò, giáo xứ hoặc giáo hạt…',
          search: async (gateway, term) => {
            const accounts = await gateway.call<ResourceRow[]>(
              'GET',
              '/system/accounts/permission-targets',
              { query: { search: term } },
            );
            return (Array.isArray(accounts) ? accounts : []).map<SelectOption>((account) => ({
              value: text(account, 'username'),
              label: joinParts([text(account, 'username'), text(account, 'leaderFullName')]),
            }));
          },
        },
      },
      {
        name: 'accountView',
        label: 'Tài khoản',
        kind: 'text',
        lockedOnEdit: true,
        visible: hideOnCreate,
      },
      {
        name: 'permissionView',
        label: 'Quyền',
        kind: 'text',
        lockedOnEdit: true,
        visible: hideOnCreate,
      },
      {
        name: 'permissions',
        label: 'Quyền chưa gán',
        kind: 'custom',
        visible: onlyCreate,
        validate: (value) =>
          parseSelection(String(value)).length > 0 ? null : 'Chọn ít nhất một quyền',
        render: (props) => <PermissionPicker source={ACCOUNT_PICKER} {...props} />,
      },
      { name: 'reason', label: 'Lý do', kind: 'multiline', required: true, maxLength: 500 },
      expiresField,
    ],
    initialValues: (row) => ({
      username: '',
      permissions: '',
      accountView: row ? text(row, 'username') : '',
      permissionView: row ? text(row, 'permissionName') : '',
      reason: row ? text(row, 'reason') : '',
      expiresAt: row ? vnDate(text(row, 'expiresAt')) : '',
    }),
    toBody: (values, mode) =>
      mode === 'create'
        ? buildAccountGrantBody({
            username: String(values.username ?? ''),
            permissionCodes: parseSelection(String(values.permissions ?? '')),
            reason: String(values.reason ?? ''),
            expiresAt: String(values.expiresAt ?? ''),
          })
        : buildAccountGrantUpdateBody({
            reason: String(values.reason ?? ''),
            expiresAt: String(values.expiresAt ?? ''),
          }),
    submit: ({ gateway, mode, row, body }) =>
      mode === 'create'
        ? gateway.call('POST', '/system/account-permissions/bulk', { body })
        : gateway.update('/system/account-permissions', text(row ?? {}, 'id'), body),
    successCreate: 'Phân quyền thành công',
    successEdit: 'Lưu cập nhật thành công',
  },
  canCreate: (subject) => canManageAccountPermissions(subject as SystemSubject | null),
  canUpdate: (subject, row) => canEditAccountPermissionRow(subject as SystemSubject | null, row),
  canToggle: () => false,
};
