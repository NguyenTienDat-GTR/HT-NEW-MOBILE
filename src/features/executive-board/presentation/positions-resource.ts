import { formatDate } from '@/core/domain/date-format';
import { trimmed } from '@/shared/resource/form-logic';
import { flag, joinParts, text } from '@/shared/resource/row';
import type { ResourceDefinition } from '@/shared/resource/types';

import {
  canCreatePosition,
  canTogglePosition,
  canUpdatePosition,
  positionCreateLevels,
  unitTypeLabel,
} from '../domain/executive-board-permissions';

const statusBadge = (active: boolean) =>
  active
    ? { label: 'Đang hoạt động', tone: 'success' as const }
    : { label: 'Tạm ngưng', tone: 'warning' as const };

export const positionsResource: ResourceDefinition = {
  id: 'positions',
  title: 'Chức vụ',
  singular: 'Chức vụ',
  endpoint: '/positions',
  idField: 'positionCode',
  searchFields: ['positionName'],
  searchPlaceholder: 'Tên chức vụ',
  defaultSort: { by: 'displayOrder', direction: 'ASC' },
  statusFilter: true,
  card: (row) => ({
    title: text(row, 'positionName'),
    subtitle: joinParts([
      unitTypeLabel(text(row, 'positionType')),
      `Thứ tự ${text(row, 'displayOrder')}`,
    ]),
    badges: [statusBadge(flag(row, 'status'))],
  }),
  detailTitle: (row) => text(row, 'positionName'),
  detailBadges: (row) => [statusBadge(flag(row, 'status'))],
  detail: (row) => [
    {
      title: 'Thông tin chức vụ',
      fields: [
        { label: 'Cấp áp dụng', value: unitTypeLabel(text(row, 'positionType')) },
        { label: 'Thứ tự hiển thị', value: text(row, 'displayOrder') },
      ],
    },
    {
      title: 'Dấu vết ghi nhận',
      collapsed: true,
      fields: [
        { label: 'Tạo bởi', value: text(row, 'createdByName') },
        { label: 'Tạo lúc', value: formatDate(text(row, 'createdAt')) },
        { label: 'Sửa bởi', value: text(row, 'updatedByName') },
        { label: 'Sửa lúc', value: formatDate(text(row, 'updatedAt')) },
      ],
    },
  ],
  form: {
    titleCreate: 'Thêm chức vụ',
    titleEdit: 'Sửa chức vụ',
    sections: [{ fields: ['positionName', 'positionType', 'displayOrder'] }],
    fields: [
      { name: 'positionName', label: 'Tên chức vụ', kind: 'text', required: true, maxLength: 100 },
      {
        name: 'positionType',
        label: 'Loại chức vụ',
        kind: 'select',
        required: true,
        lockedOnEdit: true,
        options: {
          load: async ({ subject, row }) => {
            const levels = positionCreateLevels(subject);
            // Khi sửa, hiển thị cấp hiện có của chức vụ dù tài khoản không còn quyền tạo cấp đó.
            const current = row ? [text(row, 'positionType')] : [];
            const all = Array.from(new Set([...levels, ...current]));
            return all.map((type) => ({ value: type, label: unitTypeLabel(type) }));
          },
        },
      },
      {
        name: 'displayOrder',
        label: 'Thứ tự hiển thị',
        kind: 'text',
        keyboardType: 'number-pad',
        maxLength: 4,
        hint: 'Bắt đầu từ 1; linh mục tuyên úy luôn đứng đầu. Để trống để xếp cuối cùng.',
        validate: (value) =>
          typeof value === 'string' && value.trim() !== '' && !/^[1-9]\d*$/.test(value.trim())
            ? 'Thứ tự phải là số nguyên từ 1 trở lên.'
            : null,
      },
    ],
    initialValues: (row, subject) => {
      const levels = positionCreateLevels(subject);
      return {
        positionName: row ? text(row, 'positionName') : '',
        // Chỉ một cấp được phép thì chọn sẵn.
        positionType: row ? text(row, 'positionType') : levels.length === 1 ? levels[0]! : '',
        displayOrder: row ? text(row, 'displayOrder') : '',
      };
    },
    toBody: (values) => {
      const order = trimmed(values, 'displayOrder');
      return {
        positionName: trimmed(values, 'positionName'),
        positionType: values.positionType,
        displayOrder: order === '' ? undefined : Number(order),
      };
    },
    successCreate: 'Tạo mới thành công',
    successEdit: 'Lưu cập nhật thành công',
  },
  toggle: {
    isActive: (row) => flag(row, 'status'),
    label: (row) => (flag(row, 'status') ? 'Tạm ngưng chức vụ' : 'Kích hoạt lại chức vụ'),
    confirmMessage: (row) =>
      flag(row, 'status')
        ? 'Chức vụ tạm ngưng sẽ không xuất hiện trong ban điều hành và không phân công được. Gõ "Xác nhận" để tiếp tục.'
        : 'Kích hoạt lại chức vụ. Gõ "Xác nhận" để tiếp tục.',
    requiresConfirmText: () => true,
    run: (gateway, row, input) =>
      gateway.call(
        'PATCH',
        `/positions/${encodeURIComponent(text(row, 'positionCode'))}/toggle-status`,
        {
          body: { confirmationText: input.confirmText },
        },
      ),
  },
  canCreate: (subject) => canCreatePosition(subject),
  canUpdate: (subject, row) => canUpdatePosition(subject, text(row, 'positionType')),
  canToggle: (subject, row) => canTogglePosition(subject, text(row, 'positionType')),
};
