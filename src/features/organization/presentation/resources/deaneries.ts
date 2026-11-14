import { fmtNumber } from '@/core/domain/number-format';
import { loadOptions } from '@/shared/resource/options';
import { count, flag, joinParts, text } from '@/shared/resource/row';
import type { ResourceDefinition } from '@/shared/resource/types';

import {
  canCreateDeanery,
  canToggleDeanery,
  canUpdateDeanery,
} from '../../domain/organization-permissions';

import {
  auditSection,
  commonBody,
  commonInitialValues,
  CONSENT_FIELD,
  CONTACT_FIELDS,
  contactSection,
  MILESTONE_FIELDS,
  milestoneFields,
  unitToggle,
} from './unit-common';

/** Trạng thái hiển thị: đang bật nhưng đơn vị cha ngưng thì báo riêng (giống web). */
function statusBadge(row: Record<string, unknown>) {
  if (!flag(row, 'status')) return { label: 'Tạm ngưng', tone: 'neutral' as const };
  if (row.effectiveStatus === false)
    return { label: 'Ngưng theo đơn vị cha', tone: 'warning' as const };
  return { label: 'Đang hoạt động', tone: 'success' as const };
}

export const deaneriesResource: ResourceDefinition = {
  id: 'deaneries',
  title: 'Giáo hạt',
  singular: 'Giáo hạt',
  endpoint: '/deaneries',
  searchFields: ['name', 'associationName'],
  searchPlaceholder: 'Tên giáo hạt hoặc hiệp đoàn',
  statusFilter: true,
  card: (row) => ({
    title: text(row, 'name'),
    subtitle: text(row, 'associationName'),
    lines: [joinParts([text(row, 'chaplain'), text(row, 'phoneNumber')])],
    badges: [statusBadge(row)],
  }),
  detailTitle: (row) => text(row, 'name'),
  detailBadges: (row) => [statusBadge(row)],
  detail: (row) => [
    {
      title: 'Thống kê',
      fields: [
        { label: 'Giáo xứ', value: fmtNumber(count(row, 'parishCount')) },
        { label: 'Huynh trưởng', value: fmtNumber(count(row, 'leaderCount')) },
      ],
    },
    {
      title: 'Thông tin chung',
      fields: [
        { label: 'Giáo phận', value: text(row, 'dioceseName') },
        { label: 'Hiệp đoàn', value: text(row, 'associationName') },
        ...milestoneFields(row),
      ],
    },
    contactSection(row),
    auditSection(row),
  ],
  form: {
    titleCreate: 'Thêm giáo hạt',
    titleEdit: 'Chỉnh sửa giáo hạt',
    sections: [
      { title: 'Thông tin cơ bản', fields: ['name', 'associationName', 'chaplain'] },
      { title: 'Phạm vi', fields: ['dioceseId'] },
      { title: 'Thông tin liên hệ', fields: ['phoneNumber', 'email'] },
      { title: 'Mốc thời gian', fields: ['patronSaintDay', 'establishmentDate'] },
      { fields: ['subjectConsentConfirmed'] },
    ],
    fields: [
      { name: 'name', label: 'Tên giáo hạt', kind: 'text', required: true, maxLength: 100 },
      {
        name: 'associationName',
        label: 'Tên hiệp đoàn',
        kind: 'text',
        maxLength: 100,
        hint: 'Không bắt buộc - bỏ trống nếu giáo hạt chưa thành lập hiệp đoàn.',
      },
      {
        name: 'dioceseId',
        label: 'Giáo phận',
        kind: 'select',
        required: true,
        lockedOnEdit: true,
        options: {
          load: ({ gateway }) => loadOptions(gateway, '/dioceses', { value: 'id', label: 'name' }),
        },
      },
      ...CONTACT_FIELDS,
      ...MILESTONE_FIELDS,
      CONSENT_FIELD,
    ],
    initialValues: (row, subject) => ({
      ...commonInitialValues(row),
      associationName: row ? text(row, 'associationName') : '',
      // Như web: tạo mới thì chọn sẵn giáo phận của tài khoản.
      dioceseId: row
        ? text(row, 'dioceseId')
        : ((subject as { dioceseId?: string | null } | null)?.dioceseId ?? ''),
    }),
    toBody: (values, mode) => ({
      ...commonBody(values),
      associationName: values.associationName?.toString().trim() || undefined,
      // BE không cho đổi giáo phận của giáo hạt.
      dioceseId: mode === 'create' ? values.dioceseId : undefined,
    }),
    successCreate: 'Tạo mới thành công',
    successEdit: 'Lưu cập nhật thành công',
  },
  toggle: unitToggle('/deaneries', 'giáo hạt'),
  canCreate: (subject) => canCreateDeanery(subject),
  canUpdate: (subject, row) => canUpdateDeanery(subject, text(row, 'id')),
  canToggle: (subject) => canToggleDeanery(subject),
};
