import { formatDateTime } from '@/core/domain/date-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { flag, text } from '@/shared/resource/row';
import type { ResourceDefinition } from '@/shared/resource/types';

import {
  canCreateRoles,
  canToggleRoleRow,
  canUpdateRoleRow,
  type SystemSubject,
} from '../domain/system-permissions';

const encode = (row: ResourceRow) => encodeURIComponent(text(row, 'roleCode'));

const badges = (row: ResourceRow) => [
  ...(flag(row, 'isSystem') ? [{ label: 'Vai trò hệ thống', tone: 'info' as const }] : []),
  flag(row, 'status')
    ? { label: 'Đang hoạt động', tone: 'success' as const }
    : { label: 'Tạm ngưng', tone: 'neutral' as const },
];

/** Vai trò: danh sách, chi tiết, thêm/sửa và bật/tắt (vai trò hệ thống chỉ quản trị hệ thống sửa). */
export const rolesResource: ResourceDefinition = {
  id: 'roles',
  title: 'Vai trò',
  singular: 'Vai trò',
  endpoint: '/system/roles',
  idField: 'roleCode',
  searchFields: ['roleCode', 'roleName'],
  searchPlaceholder: 'Mã hoặc tên vai trò',
  statusFilter: true,
  defaultSort: { by: 'displayOrder', direction: 'ASC' },
  filters: [
    {
      key: 'isSystem',
      label: 'Loại vai trò',
      options: [
        { value: 'true', label: 'Vai trò hệ thống' },
        { value: 'false', label: 'Vai trò tự tạo' },
      ],
    },
  ],
  card: (row) => ({
    title: text(row, 'roleName'),
    subtitle: text(row, 'roleCode'),
    lines: [text(row, 'description')],
    badges: badges(row),
  }),
  detailTitle: (row) => text(row, 'roleName'),
  detailBadges: badges,
  detail: (row) => [
    {
      title: 'Thông tin vai trò',
      fields: [
        { label: 'Mã vai trò', value: text(row, 'roleCode') },
        { label: 'Tên vai trò', value: text(row, 'roleName') },
        { label: 'Mô tả', value: text(row, 'description') },
        { label: 'Thứ tự hiển thị', value: text(row, 'displayOrder') },
        { label: 'Vai trò hệ thống', value: flag(row, 'isSystem') ? 'Có' : 'Không' },
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
    titleCreate: 'Thêm vai trò',
    titleEdit: 'Chỉnh sửa vai trò',
    sections: [
      { title: 'Thông tin vai trò', fields: ['roleCode', 'roleName', 'description'] },
      { title: 'Hiển thị', fields: ['displayOrder'] },
    ],
    fields: [
      {
        name: 'roleCode',
        label: 'Mã vai trò',
        kind: 'text',
        required: true,
        maxLength: 50,
        lockedOnEdit: true,
      },
      { name: 'roleName', label: 'Tên vai trò', kind: 'text', required: true, maxLength: 100 },
      { name: 'description', label: 'Mô tả', kind: 'multiline', maxLength: 500 },
      {
        name: 'displayOrder',
        label: 'Thứ tự hiển thị',
        kind: 'text',
        keyboardType: 'number-pad',
        maxLength: 4,
        validate: (value) =>
          typeof value === 'string' && value.trim() !== '' && !/^\d+$/.test(value.trim())
            ? 'Thứ tự là số nguyên không âm'
            : null,
      },
    ],
    initialValues: (row) => ({
      roleCode: row ? text(row, 'roleCode') : '',
      roleName: row ? text(row, 'roleName') : '',
      description: row ? text(row, 'description') : '',
      displayOrder: row ? text(row, 'displayOrder') : '',
    }),
    toBody: (values, mode) => {
      const order = String(values.displayOrder ?? '').trim();
      const body = {
        roleName: String(values.roleName ?? '').trim(),
        description: String(values.description ?? '').trim() || undefined,
        displayOrder: order === '' ? undefined : Number(order),
      };
      return mode === 'create' ? { roleCode: String(values.roleCode ?? '').trim(), ...body } : body;
    },
    successCreate: 'Thêm vai trò thành công',
    successEdit: 'Lưu cập nhật thành công',
  },
  toggle: {
    isActive: (row) => flag(row, 'status'),
    label: (row) => (flag(row, 'status') ? 'Tạm ngưng vai trò' : 'Kích hoạt lại vai trò'),
    confirmMessage: (row) =>
      flag(row, 'status')
        ? 'Tạm ngưng vai trò này. Bạn có thể kích hoạt lại sau.'
        : 'Kích hoạt lại vai trò này.',
    run: (gateway, row) =>
      gateway.call('PATCH', `/system/roles/${encode(row)}/toggle-status`, {
        body: { confirmationText: 'Xác nhận' },
      }),
  },
  canCreate: (subject) => canCreateRoles(subject as SystemSubject | null),
  canUpdate: (subject, row) => canUpdateRoleRow(subject as SystemSubject | null, row),
  canToggle: (subject, row) => canToggleRoleRow(subject as SystemSubject | null, row),
};
