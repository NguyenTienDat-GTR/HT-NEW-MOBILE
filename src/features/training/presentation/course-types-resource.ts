import { formatDate } from '@/core/domain/date-format';
import { optional, trimmed } from '@/shared/resource/form-logic';
import { loadLevelOptions } from '@/shared/resource/options';
import { flag, joinParts, text } from '@/shared/resource/row';
import type { ResourceDefinition } from '@/shared/resource/types';

import {
  canCreateCourseType,
  canToggleCourseType,
  canUpdateCourseType,
  managedUnitTypes,
  type TrainingSubject,
} from '../domain/training-permissions';
import { unitLabel } from '../domain/training-labels';

const UNIT_OPTIONS = [
  { value: 'DIOCESE', label: 'Giáo phận' },
  { value: 'DEANERY', label: 'Giáo hạt' },
] as const;

const OWNER_OPTIONS = [
  { value: 'DIOCESE', label: 'Giáo phận tạo' },
  { value: 'DEANERY', label: 'Giáo hạt tự tạo' },
] as const;

const ownerLabel = (row: Record<string, unknown>) => {
  if (row.ownerUnitType === 'DEANERY') return 'Giáo hạt tự tạo';
  return row.managementUnitType === 'DEANERY' ? 'Giáo phận tạo · dùng chung' : 'Giáo phận';
};

const statusBadge = (active: boolean) =>
  active
    ? { label: 'Đang hoạt động', tone: 'success' as const }
    : { label: 'Tạm ngưng', tone: 'warning' as const };

interface PrerequisiteOption {
  typeCode: string;
  typeName: string;
  ownerUnitType?: string;
  selectable?: boolean;
}

/** Loại khóa: điều kiện tham dự (cấp độ, tuổi, khóa tiên quyết), chứng nhận và cấp độ khi hoàn thành. */
export const courseTypesResource: ResourceDefinition = {
  id: 'course-types',
  title: 'Loại khóa',
  singular: 'Loại khóa',
  endpoint: '/training/course-types',
  idField: 'typeCode',
  searchFields: ['typeName'],
  searchPlaceholder: 'Tên loại khóa',
  statusFilter: true,
  filters: [
    { key: 'managementUnitType', label: 'Cấp quản lý', options: UNIT_OPTIONS },
    { key: 'ownerUnitType', label: 'Nguồn tạo', options: OWNER_OPTIONS },
  ],
  card: (row) => ({
    title: text(row, 'typeName'),
    subtitle: joinParts([unitLabel(row.managementUnitType), ownerLabel(row)]),
    lines: [
      text(row, 'prerequisiteTypeName') ? `Tiên quyết: ${text(row, 'prerequisiteTypeName')}` : '',
    ],
    badges: [statusBadge(flag(row, 'status'))],
  }),
  detailTitle: (row) => text(row, 'typeName'),
  detailBadges: (row) => [
    statusBadge(flag(row, 'status')),
    ...(flag(row, 'hasCertificate') ? [{ label: 'Có chứng nhận', tone: 'info' as const }] : []),
  ],
  detail: (row) => [
    {
      title: 'Thông tin loại khóa',
      fields: [
        { label: 'Cấp quản lý', value: unitLabel(row.managementUnitType) },
        { label: 'Nguồn tạo', value: ownerLabel(row) },
      ],
    },
    {
      title: 'Điều kiện tham dự',
      fields: [
        { label: 'Cấp độ yêu cầu', value: text(row, 'requiredCurrentLevel') },
        {
          label: 'Tuổi tối thiểu',
          value:
            text(row, 'requiredMinAge') && text(row, 'requiredMinAge') !== '0'
              ? text(row, 'requiredMinAge')
              : '',
        },
        { label: 'Khóa tiên quyết', value: text(row, 'prerequisiteTypeName') },
        {
          label: 'Thời hạn sau khóa tiên quyết',
          value: text(row, 'maxYearsAfterPrerequisite')
            ? `${text(row, 'maxYearsAfterPrerequisite')} năm`
            : '',
        },
      ],
    },
    {
      title: 'Chứng nhận và thăng cấp',
      fields: [
        { label: 'Cấp chứng nhận', value: flag(row, 'hasCertificate') ? 'Có' : 'Không' },
        { label: 'Mã viết tắt chứng chỉ', value: text(row, 'certificateShortCode') },
        { label: 'Cấp độ khi hoàn thành', value: text(row, 'resultingLevel') },
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
    titleCreate: 'Thêm loại khóa',
    titleEdit: 'Sửa loại khóa',
    sections: [
      { title: 'Thông tin loại khóa', fields: ['typeName', 'managementUnitType'] },
      {
        title: 'Điều kiện tham dự',
        fields: [
          'prerequisiteTypeCode',
          'maxYearsAfterPrerequisite',
          'requiredCurrentLevel',
          'requiredMinAge',
        ],
      },
      { title: 'Chứng nhận', fields: ['hasCertificate', 'certificateShortCode'] },
      { title: 'Thăng cấp khi hoàn thành', fields: ['resultingLevel'] },
    ],
    fields: [
      { name: 'typeName', label: 'Tên loại khóa', kind: 'text', required: true, maxLength: 255 },
      {
        name: 'managementUnitType',
        label: 'Cấp quản lý',
        kind: 'select',
        required: true,
        resets: ['prerequisiteTypeCode'],
        options: {
          load: async ({ subject }) => {
            const allowed = managedUnitTypes(subject as TrainingSubject | null, 'course_type');
            return UNIT_OPTIONS.filter((o) => allowed.length === 0 || allowed.includes(o.value));
          },
        },
      },
      {
        name: 'prerequisiteTypeCode',
        label: 'Khóa tiên quyết',
        kind: 'select',
        hint: 'Huynh trưởng phải hoàn thành một khóa thuộc loại này (theo chứng nhận được duyệt, hoặc theo kết quả đạt nếu loại đó không cấp chứng nhận).',
        options: {
          dependsOn: ['managementUnitType'],
          load: async ({ gateway, values, row }) => {
            const options = await gateway.call<PrerequisiteOption[]>(
              'GET',
              '/training/course-types/prerequisite-options',
              {
                query: {
                  managementUnitType: String(values.managementUnitType ?? '') || undefined,
                  forTypeCode: row ? text(row, 'typeCode') : undefined,
                },
              },
            );
            return options
              .filter((option) => option.selectable !== false)
              .map((option) => ({
                value: option.typeCode,
                label: `${option.typeName}${option.ownerUnitType === 'DEANERY' ? ' (giáo hạt tạo)' : ''}`,
              }));
          },
        },
      },
      {
        name: 'maxYearsAfterPrerequisite',
        label: 'Thời hạn tối đa sau khóa tiên quyết (năm)',
        kind: 'text',
        keyboardType: 'number-pad',
        maxLength: 3,
        hint: 'Phải đi khóa này trong vòng bao nhiêu năm kể từ lần đạt khóa tiên quyết gần nhất. Để trống nếu không giới hạn.',
        visible: (values) => String(values.prerequisiteTypeCode ?? '') !== '',
        validate: (value) =>
          typeof value === 'string' && value.trim() !== '' && !/^[1-9]\d*$/.test(value.trim())
            ? 'Phải là số nguyên từ 1 trở lên'
            : null,
      },
      {
        name: 'requiredCurrentLevel',
        label: 'Cấp độ yêu cầu',
        kind: 'select',
        hint: 'Huynh trưởng phải đang ở đúng cấp này mới đủ điều kiện. Khóa cho huynh trưởng chưa có cấp thì chọn "Chưa có cấp".',
        options: { load: ({ gateway }) => loadLevelOptions(gateway) },
      },
      {
        name: 'requiredMinAge',
        label: 'Tuổi tối thiểu',
        kind: 'text',
        keyboardType: 'number-pad',
        maxLength: 3,
        hint: 'Không bắt buộc. Nhập 0 để bỏ tuổi tối thiểu đã lưu.',
        validate: (value) =>
          typeof value === 'string' && value.trim() !== '' && !/^\d+$/.test(value.trim())
            ? 'Phải là số nguyên không âm'
            : null,
      },
      {
        name: 'hasCertificate',
        label: 'Khóa có cấp chứng nhận',
        kind: 'switch',
        hint: 'Bật để nhập mã viết tắt chứng chỉ. Loại khóa đã cấp chứng nhận thì không tắt lại được.',
      },
      {
        name: 'certificateShortCode',
        label: 'Mã viết tắt chứng chỉ',
        kind: 'text',
        maxLength: 20,
        hint: 'Dùng để sinh mã chứng chỉ, ví dụ HTI.',
        visible: (values) => values.hasCertificate === true,
        validate: (value, values) =>
          values.hasCertificate === true && (typeof value !== 'string' || value.trim() === '')
            ? 'Vui lòng nhập mã viết tắt chứng chỉ'
            : null,
      },
      {
        name: 'resultingLevel',
        label: 'Cấp độ khi hoàn thành',
        kind: 'select',
        hint: 'Không bắt buộc. Để trống nếu hoàn thành khóa không thăng cấp.',
        options: { load: ({ gateway }) => loadLevelOptions(gateway) },
      },
    ],
    initialValues: (row) => ({
      typeName: row ? text(row, 'typeName') : '',
      managementUnitType: row ? text(row, 'managementUnitType') : '',
      prerequisiteTypeCode: row ? text(row, 'prerequisiteTypeCode') : '',
      maxYearsAfterPrerequisite: row ? text(row, 'maxYearsAfterPrerequisite') : '',
      requiredCurrentLevel: row ? text(row, 'requiredCurrentLevel') : '',
      requiredMinAge: row ? text(row, 'requiredMinAge') : '',
      hasCertificate: row ? flag(row, 'hasCertificate') : false,
      certificateShortCode: row ? text(row, 'certificateShortCode') : '',
      resultingLevel: row ? text(row, 'resultingLevel') : '',
    }),
    toBody: (values, mode, row) => {
      const edit = mode === 'edit';
      const prerequisite = optional(values, 'prerequisiteTypeCode');
      const maxYears = optional(values, 'maxYearsAfterPrerequisite');
      const age = optional(values, 'requiredMinAge');
      const hasCertificate = values.hasCertificate === true;
      const body: Record<string, unknown> = {
        typeName: trimmed(values, 'typeName'),
        managementUnitType: values.managementUnitType,
        requiredCurrentLevel: optional(values, 'requiredCurrentLevel'),
        requiredMinAge: age === undefined ? undefined : Number(age),
        prerequisiteTypeCode: prerequisite,
        maxYearsAfterPrerequisite: prerequisite && maxYears ? Number(maxYears) : undefined,
        resultingLevel: optional(values, 'resultingLevel'),
        hasCertificate,
        certificateShortCode: hasCertificate ? optional(values, 'certificateShortCode') : undefined,
      };
      if (edit && row) {
        // Ô để trống khi sửa nghĩa là bỏ giá trị đã lưu: BE chỉ hiểu qua các cờ xóa.
        if (!body.resultingLevel) body.clearResultingLevel = true;
        if (!prerequisite && text(row, 'prerequisiteTypeCode')) {
          body.clearPrerequisite = true;
          body.clearMaxYearsAfterPrerequisite = true;
        } else if (prerequisite && !maxYears && text(row, 'maxYearsAfterPrerequisite')) {
          body.clearMaxYearsAfterPrerequisite = true;
        }
      }
      return body;
    },
    successCreate: 'Tạo mới thành công',
    successEdit: 'Lưu cập nhật thành công',
  },
  toggle: {
    isActive: (row) => flag(row, 'status'),
    label: (row) => (flag(row, 'status') ? 'Tạm ngưng loại khóa' : 'Kích hoạt lại loại khóa'),
    confirmMessage: (row) =>
      flag(row, 'status')
        ? 'Loại khóa tạm ngưng sẽ không chọn được khi tạo khóa mới. Gõ "Xác nhận" để tiếp tục.'
        : 'Kích hoạt lại loại khóa. Gõ "Xác nhận" để tiếp tục.',
    requiresConfirmText: () => true,
    run: (gateway, row, input) =>
      gateway.call(
        'PATCH',
        `/training/course-types/${encodeURIComponent(text(row, 'typeCode'))}/toggle-status`,
        { body: { confirmationText: input.confirmText } },
      ),
  },
  canCreate: (subject) => canCreateCourseType(subject),
  canUpdate: (subject, row) => canUpdateCourseType(subject) && row.editable !== false,
  canToggle: (subject, row) => canToggleCourseType(subject) && row.editable !== false,
};
