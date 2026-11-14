import { fmtNumber } from '@/core/domain/number-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { loadOptions } from '@/shared/resource/options';
import { count, flag, joinParts, text } from '@/shared/resource/row';
import type { ResourceDefinition } from '@/shared/resource/types';

import {
  canCreateParish,
  canToggleParish,
  canUpdateParish,
} from '../../domain/organization-permissions';
import { ParishActions } from '../ParishActions';

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

const UNIT_TYPES = [
  { value: 'PARISH', label: 'Giáo xứ' },
  { value: 'GIAO_HO', label: 'Giáo họ' },
  { value: 'GIAO_DIEM', label: 'Giáo điểm' },
] as const;

function statusBadge(row: ResourceRow) {
  if (!flag(row, 'status')) return { label: 'Tạm ngưng', tone: 'neutral' as const };
  if (row.effectiveStatus === false)
    return { label: 'Ngưng theo đơn vị cha', tone: 'warning' as const };
  return { label: 'Đang hoạt động', tone: 'success' as const };
}

const isSubUnit = (unitType: unknown) => unitType === 'GIAO_HO' || unitType === 'GIAO_DIEM';

export const parishesResource: ResourceDefinition = {
  id: 'parishes',
  title: 'Giáo xứ, giáo họ, giáo điểm',
  singular: 'Giáo xứ',
  createLabel: 'Thêm giáo xứ / họ / điểm',
  endpoint: '/parishes',
  searchFields: ['name', 'chapterName'],
  searchPlaceholder: 'Tên đơn vị hoặc xứ đoàn',
  statusFilter: true,
  filters: [
    {
      key: 'deanery.id',
      label: 'Giáo hạt',
      options: {
        load: ({ gateway }) => loadOptions(gateway, '/deaneries', { value: 'id', label: 'name' }),
      },
    },
    { key: 'unitType', label: 'Loại đơn vị', options: UNIT_TYPES },
  ],
  card: (row) => ({
    title: text(row, 'name'),
    subtitle: joinParts([text(row, 'unitTypeLabel'), text(row, 'parentParishName')]),
    lines: [
      joinParts([text(row, 'deaneryName'), `${fmtNumber(count(row, 'leaderCount'))} huynh trưởng`]),
    ],
    badges: [statusBadge(row)],
  }),
  detailTitle: (row) => text(row, 'name'),
  detailBadges: (row) => [
    { label: text(row, 'unitTypeLabel') || 'Giáo xứ', tone: 'info' },
    statusBadge(row),
  ],
  detail: (row) => [
    {
      title: 'Thống kê',
      fields: [
        ...(text(row, 'unitType') === 'PARISH'
          ? [{ label: 'Giáo họ / giáo điểm', value: fmtNumber(count(row, 'subUnitCount')) }]
          : []),
        { label: 'Huynh trưởng', value: fmtNumber(count(row, 'leaderCount')) },
      ],
    },
    {
      title: 'Thông tin chung',
      fields: [
        { label: 'Giáo phận', value: text(row, 'dioceseName') },
        { label: 'Giáo hạt', value: text(row, 'deaneryName') },
        { label: 'Loại đơn vị', value: text(row, 'unitTypeLabel') },
        { label: 'Thuộc giáo xứ', value: text(row, 'parentParishName') },
        { label: 'Xứ đoàn', value: text(row, 'chapterName') },
        ...milestoneFields(row),
      ],
    },
    contactSection(row),
    auditSection(row),
  ],
  form: {
    titleCreate: 'Thêm giáo xứ / giáo họ / giáo điểm',
    titleEdit: 'Chỉnh sửa giáo xứ / giáo họ / giáo điểm',
    sections: [
      {
        title: 'Thông tin cơ bản',
        fields: ['unitType', 'name', 'chapterName', 'chaplain'],
      },
      { title: 'Phạm vi', fields: ['deaneryId', 'parentParishId'] },
      { title: 'Thông tin liên hệ', fields: ['phoneNumber', 'email'] },
      { title: 'Mốc thời gian', fields: ['patronSaintDay', 'establishmentDate'] },
      { fields: ['subjectConsentConfirmed'] },
    ],
    fields: [
      {
        name: 'unitType',
        label: 'Loại đơn vị',
        kind: 'select',
        required: true,
        lockedOnEdit: true,
        options: UNIT_TYPES,
        resets: ['parentParishId'],
        hint: 'Giáo họ / giáo điểm thuộc một giáo xứ và có admin riêng; admin giáo xứ cha không quản lý giáo họ / giáo điểm của mình.',
      },
      { name: 'name', label: 'Tên đơn vị', kind: 'text', required: true, maxLength: 100 },
      {
        name: 'chapterName',
        label: 'Tên xứ đoàn',
        kind: 'text',
        maxLength: 100,
        hint: 'Không bắt buộc - bỏ trống nếu đơn vị chưa thành lập xứ đoàn.',
      },
      {
        name: 'deaneryId',
        label: 'Giáo hạt',
        kind: 'select',
        required: true,
        lockedOnEdit: true,
        resets: ['parentParishId'],
        options: {
          load: ({ gateway }) => loadOptions(gateway, '/deaneries', { value: 'id', label: 'name' }),
        },
      },
      {
        name: 'parentParishId',
        label: 'Thuộc giáo xứ',
        kind: 'select',
        required: true,
        hint: 'Chọn giáo hạt trước, rồi chọn giáo xứ cha trong giáo hạt đó.',
        visible: (values, mode) => mode === 'create' && isSubUnit(values.unitType),
        options: {
          dependsOn: ['deaneryId'],
          load: async ({ gateway, values }) =>
            values.deaneryId
              ? loadOptions(
                  gateway,
                  '/parishes',
                  { value: 'id', label: 'name' },
                  { filters: { 'deanery.id': String(values.deaneryId), unitType: 'PARISH' } },
                )
              : [],
        },
      },
      ...CONTACT_FIELDS,
      ...MILESTONE_FIELDS,
      CONSENT_FIELD,
    ],
    initialValues: (row) => ({
      ...commonInitialValues(row),
      unitType: row ? text(row, 'unitType') : 'PARISH',
      chapterName: row ? text(row, 'chapterName') : '',
      deaneryId: row ? text(row, 'deaneryId') : '',
      parentParishId: '',
    }),
    toBody: (values, mode) => {
      const unitType = String(values.unitType);
      const body: Record<string, unknown> = {
        ...commonBody(values),
        chapterName: values.chapterName?.toString().trim() || undefined,
      };
      if (mode === 'create') {
        body.unitType = unitType;
        body.deaneryId = values.deaneryId;
        if (isSubUnit(unitType)) body.parentParishId = values.parentParishId;
      }
      return body;
    },
    successCreate: 'Tạo mới thành công',
    successEdit: 'Lưu cập nhật thành công',
  },
  toggle: unitToggle('/parishes', 'giáo xứ'),
  canCreate: (subject) => canCreateParish(subject),
  canUpdate: (subject) => canUpdateParish(subject),
  canToggle: (subject) => canToggleParish(subject),
  renderDetailExtra: ({ row, subject }) => (
    <ParishActions def={parishesResource} row={row} subject={subject} />
  ),
};
