import { formatDate, formatDateTime } from '@/core/domain/date-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { loadOptions } from '@/shared/resource/options';
import { flag, joinParts, text } from '@/shared/resource/row';
import type { ResourceDefinition, SelectOption } from '@/shared/resource/types';

import { parseRoleChoice } from '../domain/account-create';
import {
  buildAssignmentUpdateBody,
  buildBulkAssignBody,
  vnDate,
} from '../domain/account-role-body';
import {
  canAssignAccountRoles,
  canEditAccountRoleRow,
  canToggleAccountRoleRow,
  type SystemSubject,
} from '../domain/system-permissions';

import { AssignRolesField } from './AccountRolesFields';

const badges = (row: ResourceRow) => [
  flag(row, 'isPrimary')
    ? { label: 'Vai trò chính', tone: 'info' as const }
    : { label: 'Vai trò phụ', tone: 'neutral' as const },
  flag(row, 'status')
    ? { label: 'Đang hoạt động', tone: 'success' as const }
    : { label: 'Tạm ngưng', tone: 'neutral' as const },
];

/** Gán vai trò: danh sách các lần gán, gán nhiều vai trò cho một tài khoản, đổi vai trò chính / hạn dùng, bật/tắt. */
export const accountRolesResource: ResourceDefinition = {
  id: 'account-roles',
  title: 'Gán vai trò',
  singular: 'Lần gán vai trò',
  createLabel: 'Gán nhiều vai trò',
  endpoint: '/system/account-roles',
  idField: 'id',
  searchFields: ['username', 'roleCode', 'assignedBy'],
  searchPlaceholder: 'Tên đăng nhập hoặc mã vai trò',
  statusFilter: true,
  filters: [
    {
      key: 'role.roleCode',
      label: 'Vai trò',
      options: {
        load: ({ gateway }) =>
          loadOptions(gateway, '/system/roles', { value: 'roleCode', label: 'roleName' }),
      },
    },
    {
      key: 'isPrimary',
      label: 'Vai trò chính',
      options: [
        { value: 'true', label: 'Chính' },
        { value: 'false', label: 'Phụ' },
      ],
    },
  ],
  card: (row) => ({
    title: text(row, 'username'),
    subtitle: joinParts([text(row, 'leaderFullName'), text(row, 'roleName')]),
    lines: [
      text(row, 'expiresAt')
        ? `Hết hạn ${formatDate(text(row, 'expiresAt'))}`
        : 'Không giới hạn thời gian',
    ],
    badges: badges(row),
  }),
  detailTitle: (row) => joinParts([text(row, 'username'), text(row, 'roleName')], ' · '),
  detailBadges: badges,
  detail: (row) => [
    {
      title: 'Vai trò của tài khoản',
      fields: [
        { label: 'Tài khoản', value: text(row, 'username') },
        { label: 'Huynh trưởng', value: text(row, 'leaderFullName') },
        { label: 'Vai trò', value: text(row, 'roleName') },
        { label: 'Loại vai trò', value: flag(row, 'isPrimary') ? 'Vai trò chính' : 'Vai trò phụ' },
        { label: 'Trạng thái', value: flag(row, 'status') ? 'Đang hoạt động' : 'Tạm ngưng' },
      ],
    },
    {
      title: 'Gán vai trò',
      fields: [
        { label: 'Người gán', value: text(row, 'assignedByName') || text(row, 'assignedBy') },
        { label: 'Ngày gán', value: formatDateTime(text(row, 'assignedAt')) },
        { label: 'Hết hạn', value: formatDateTime(text(row, 'expiresAt')) },
      ],
    },
    {
      title: 'Lịch sử ghi nhận',
      collapsed: true,
      fields: [
        { label: 'Người tạo', value: text(row, 'createdByName') },
        { label: 'Ngày tạo', value: formatDateTime(text(row, 'createdAt')) },
        { label: 'Người cập nhật', value: text(row, 'updatedByName') },
        { label: 'Ngày cập nhật', value: formatDateTime(text(row, 'updatedAt')) },
      ],
    },
  ],
  form: {
    titleCreate: 'Gán nhiều vai trò cho tài khoản',
    titleEdit: 'Chỉnh sửa gán vai trò',
    sections: [
      { title: 'Tài khoản', fields: ['username', 'accountView', 'roleView'] },
      { title: 'Vai trò', fields: ['roles', 'isPrimary'] },
      { title: 'Thời hạn', fields: ['expiresAt'] },
    ],
    fields: [
      {
        name: 'username',
        label: 'Tài khoản',
        kind: 'lookup',
        required: true,
        visible: (_values, mode) => mode === 'create',
        resets: ['roles'],
        lookup: {
          placeholder: 'Gõ tên đăng nhập hoặc tên huynh trưởng…',
          search: async (gateway, term) => {
            const page = await gateway.list('/system/accounts', {
              page: 0,
              size: 20,
              search: term,
              status: true,
            });
            return page.content.map<SelectOption>((row) => ({
              value: text(row, 'username'),
              label: joinParts([text(row, 'username'), text(row, 'leaderFullName')]),
            }));
          },
        },
      },
      {
        name: 'accountView',
        label: 'Tài khoản',
        kind: 'text',
        lockedOnEdit: true,
        visible: (_values, mode) => mode === 'edit',
      },
      {
        name: 'roleView',
        label: 'Vai trò',
        kind: 'text',
        lockedOnEdit: true,
        visible: (_values, mode) => mode === 'edit',
      },
      {
        name: 'roles',
        label: 'Vai trò cần gán',
        kind: 'custom',
        visible: (_values, mode) => mode === 'create',
        validate: (value) =>
          parseRoleChoice(String(value)).codes.length > 0 ? null : 'Chọn ít nhất một vai trò',
        render: (props) => <AssignRolesField {...props} />,
      },
      {
        name: 'isPrimary',
        label: 'Vai trò chính của tài khoản',
        kind: 'switch',
        visible: (_values, mode) => mode === 'edit',
      },
      {
        name: 'expiresAt',
        label: 'Ngày hết hạn',
        kind: 'date',
        hint: 'Để trống nếu không giới hạn. Hạn đã đặt không xóa được; muốn bỏ hạn hãy bật/tắt hoặc gán lại.',
      },
    ],
    initialValues: (row) => ({
      username: '',
      roles: '',
      accountView: row ? text(row, 'username') : '',
      roleView: row ? text(row, 'roleName') : '',
      isPrimary: row ? flag(row, 'isPrimary') : false,
      expiresAt: row ? vnDate(text(row, 'expiresAt')) : '',
    }),
    toBody: (values, mode) =>
      mode === 'create'
        ? buildBulkAssignBody({
            username: String(values.username ?? ''),
            roleCodes: parseRoleChoice(String(values.roles ?? '')).codes,
            expiresAt: String(values.expiresAt ?? ''),
          })
        : buildAssignmentUpdateBody({
            isPrimary: values.isPrimary === true,
            expiresAt: String(values.expiresAt ?? ''),
          }),
    // Tạo mới gán nhiều vai trò một lần (endpoint /bulk); sửa dùng PUT chuẩn.
    submit: ({ gateway, mode, row, body }) =>
      mode === 'create'
        ? gateway.call('POST', '/system/account-roles/bulk', { body })
        : gateway.update('/system/account-roles', text(row ?? {}, 'id'), body),
    successCreate: 'Gán vai trò thành công',
    successEdit: 'Lưu cập nhật thành công',
  },
  toggle: {
    isActive: (row) => flag(row, 'status'),
    label: (row) => (flag(row, 'status') ? 'Tạm ngưng lần gán này' : 'Kích hoạt lại lần gán này'),
    confirmMessage: (row) =>
      flag(row, 'status')
        ? 'Tài khoản sẽ không còn vai trò này cho tới khi kích hoạt lại.'
        : 'Tài khoản có lại vai trò này.',
    run: (gateway, row) =>
      gateway.call(
        'PATCH',
        `/system/account-roles/${encodeURIComponent(text(row, 'id'))}/toggle-status`,
        {
          body: { confirmationText: 'Xác nhận' },
        },
      ),
  },
  canCreate: (subject) => canAssignAccountRoles(subject as SystemSubject | null),
  canUpdate: (subject) => canEditAccountRoleRow(subject as SystemSubject | null),
  canToggle: (subject) => canToggleAccountRoleRow(subject as SystemSubject | null),
};
