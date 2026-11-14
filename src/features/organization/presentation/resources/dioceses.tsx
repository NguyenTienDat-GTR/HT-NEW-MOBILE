import { joinParts, flag, text, count } from '@/shared/resource/row';
import { fmtNumber } from '@/core/domain/number-format';
import type { ResourceDefinition } from '@/shared/resource/types';

import { UnitExtras } from '../UnitExtras';
import {
  canCreateDiocese,
  canToggleDiocese,
  canUpdateDiocese,
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

export const diocesesResource: ResourceDefinition = {
  id: 'dioceses',
  title: 'Giáo phận',
  singular: 'Giáo phận',
  endpoint: '/dioceses',
  searchFields: ['name', 'unionName'],
  searchPlaceholder: 'Tên giáo phận hoặc liên đoàn',
  statusFilter: true,
  card: (row) => ({
    title: text(row, 'name'),
    subtitle: text(row, 'unionName'),
    lines: [joinParts([text(row, 'chaplain'), text(row, 'phoneNumber')])],
    badges: [
      flag(row, 'status')
        ? { label: 'Đang hoạt động', tone: 'success' }
        : { label: 'Tạm ngưng', tone: 'neutral' },
    ],
  }),
  detailTitle: (row) => text(row, 'name'),
  detailBadges: (row) => [
    flag(row, 'status')
      ? { label: 'Đang hoạt động', tone: 'success' }
      : { label: 'Tạm ngưng', tone: 'neutral' },
  ],
  detail: (row) => [
    {
      title: 'Thống kê',
      fields: [
        { label: 'Giáo hạt', value: fmtNumber(count(row, 'deaneryCount')) },
        { label: 'Giáo xứ', value: fmtNumber(count(row, 'parishCount')) },
        { label: 'Huynh trưởng', value: fmtNumber(count(row, 'leaderCount')) },
      ],
    },
    {
      title: 'Thông tin chung',
      fields: [{ label: 'Liên đoàn', value: text(row, 'unionName') }, ...milestoneFields(row)],
    },
    contactSection(row),
    auditSection(row),
  ],
  form: {
    titleCreate: 'Thêm giáo phận',
    titleEdit: 'Chỉnh sửa giáo phận',
    sections: [
      { title: 'Thông tin cơ bản', fields: ['name', 'unionName', 'chaplain'] },
      { title: 'Thông tin liên hệ', fields: ['phoneNumber', 'email'] },
      { title: 'Mốc thời gian', fields: ['patronSaintDay', 'establishmentDate'] },
      { fields: ['subjectConsentConfirmed'] },
    ],
    fields: [
      { name: 'name', label: 'Tên giáo phận', kind: 'text', required: true, maxLength: 100 },
      { name: 'unionName', label: 'Tên liên đoàn', kind: 'text', required: true, maxLength: 100 },
      ...CONTACT_FIELDS,
      ...MILESTONE_FIELDS,
      CONSENT_FIELD,
    ],
    initialValues: (row) => ({
      ...commonInitialValues(row),
      unionName: row ? text(row, 'unionName') : '',
    }),
    toBody: (values) => ({ ...commonBody(values), unionName: values.unionName?.toString().trim() }),
    successCreate: 'Tạo mới thành công',
    successEdit: 'Lưu cập nhật thành công',
  },
  toggle: unitToggle('/dioceses', 'giáo phận'),
  canCreate: (subject) => canCreateDiocese(subject),
  canUpdate: (subject) => canUpdateDiocese(subject),
  canToggle: (subject) => canToggleDiocese(subject),
  renderDetailExtra: ({ row }) => <UnitExtras kind="dioceses" row={row} />,
};
