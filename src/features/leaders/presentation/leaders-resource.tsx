import { formatDate } from '@/core/domain/date-format';
import { optional, trimmed } from '@/shared/resource/form-logic';
import { loadOptions } from '@/shared/resource/options';
import { flag, joinParts, text } from '@/shared/resource/row';
import type { ResourceDefinition, SelectOption } from '@/shared/resource/types';

import { GENDER_OPTIONS, levelLabel, parishOptionLabel } from '../domain/leader-labels';
import { canCreateLeader, canToggleLeader, canUpdateLeader } from '../domain/leader-permissions';

import { LeaderDetailScreen } from './LeaderDetailScreen';

interface LevelDto {
  levelCode: string;
  levelName: string;
}

/** Danh mục cấp độ của giáo phận (mảng, không phân trang), dùng cho ô chọn và bộ lọc. */
export const leaderLevelOptions = {
  load: async ({
    gateway,
  }: {
    gateway: { call<T>(method: 'GET', path: string): Promise<T> };
  }): Promise<SelectOption[]> => {
    const levels = await gateway.call<LevelDto[]>('GET', '/leader-levels/options');
    return levels.map((level) => ({ value: level.levelCode, label: level.levelName }));
  },
};

const deaneryOptions = {
  load: ({ gateway }: { gateway: Parameters<typeof loadOptions>[0] }) =>
    loadOptions(gateway, '/deaneries', { value: 'id', label: 'name' }),
};

/** Giáo xứ thuộc giáo hạt đã chọn; chưa chọn giáo hạt thì chưa tải (như web). */
function parishOptions(onlyActive: boolean) {
  return {
    dependsOn: ['deaneryId'] as const,
    load: async ({
      gateway,
      values,
    }: {
      gateway: Parameters<typeof loadOptions>[0];
      values: Record<string, string | boolean>;
    }) =>
      values.deaneryId
        ? loadOptions(
            gateway,
            '/parishes',
            { value: 'id', label: parishOptionLabel },
            {
              filters: { 'deanery.id': String(values.deaneryId) },
              status: onlyActive || undefined,
            },
          )
        : [],
  };
}

const fullName = (row: Record<string, unknown>) =>
  joinParts([text(row, 'holyName'), text(row, 'fullName')], ' ');

export const leadersResource: ResourceDefinition = {
  id: 'leaders',
  title: 'Hồ sơ huynh trưởng',
  singular: 'Huynh trưởng',
  endpoint: '/leaders',
  searchFields: [
    'lastName+firstName',
    'holyName',
    'email',
    'phoneNumber',
    'parish.name',
    'parish.deanery.name',
  ],
  searchPlaceholder: 'Tên, email, số điện thoại, giáo xứ',
  statusFilter: true,
  filters: [
    { key: 'parish.deanery.id', label: 'Giáo hạt', options: deaneryOptions },
    {
      key: 'parish.id',
      label: 'Giáo xứ / họ / điểm',
      dependsOn: ['parish.deanery.id'],
      options: {
        dependsOn: ['parish.deanery.id'],
        load: ({ gateway, values }) =>
          loadOptions(
            gateway,
            '/parishes',
            { value: 'id', label: parishOptionLabel },
            { filters: { 'deanery.id': String(values['parish.deanery.id'] ?? '') } },
          ),
      },
    },
    { key: 'leaderLevel', label: 'Cấp huynh trưởng', options: leaderLevelOptions },
  ],
  card: (row) => ({
    title: fullName(row),
    subtitle: joinParts([
      text(row, 'subUnitName') || text(row, 'parishName'),
      text(row, 'deaneryName'),
    ]),
    lines: [levelLabel(text(row, 'leaderLevel')), text(row, 'email')],
    badges: [
      flag(row, 'status')
        ? { label: 'Đang hoạt động', tone: 'success' }
        : { label: 'Tạm ngưng', tone: 'warning' },
    ],
  }),
  detailTitle: fullName,
  // Màn chi tiết riêng (LeaderDetailScreen) thay thế; các hàm dưới đây chỉ để thỏa kiểu.
  detail: (row) => [
    { fields: [{ label: 'Ngày sinh', value: formatDate(text(row, 'birthDate')) }] },
  ],
  renderDetail: ({ def, id, subject, onEdit }) => (
    <LeaderDetailScreen def={def} id={id} subject={subject} onEdit={onEdit} />
  ),
  form: {
    titleCreate: 'Thêm huynh trưởng',
    titleEdit: 'Sửa hồ sơ huynh trưởng',
    sections: [
      { title: 'Thông tin cá nhân', fields: ['holyName', 'fullName', 'birthDate', 'gender'] },
      { title: 'Liên hệ', fields: ['phoneNumber', 'email'] },
      { title: 'Đơn vị và cấp', fields: ['deaneryId', 'parishId', 'leaderLevel'] },
      { fields: ['subjectConsentConfirmed'] },
    ],
    fields: [
      { name: 'holyName', label: 'Tên thánh', kind: 'text', required: true, maxLength: 50 },
      {
        name: 'fullName',
        label: 'Họ và tên',
        kind: 'text',
        required: true,
        maxLength: 200,
        lockedOnEdit: true,
      },
      {
        name: 'birthDate',
        label: 'Ngày sinh',
        kind: 'date',
        required: true,
        maxDate: 'today',
        lockedOnEdit: true,
        hint: 'Sau khi tạo, đổi ngày sinh bằng nút riêng ở trang chi tiết.',
      },
      {
        name: 'gender',
        label: 'Giới tính',
        kind: 'select',
        required: true,
        options: GENDER_OPTIONS,
      },
      { name: 'phoneNumber', label: 'Số điện thoại', kind: 'phone', required: true, maxLength: 10 },
      { name: 'email', label: 'Email', kind: 'email', maxLength: 100 },
      {
        name: 'deaneryId',
        label: 'Giáo hạt',
        kind: 'select',
        required: true,
        lockedOnEdit: true,
        excludeFromBody: true,
        resets: ['parishId'],
        options: deaneryOptions,
      },
      {
        name: 'parishId',
        label: 'Giáo xứ / họ / điểm',
        kind: 'select',
        required: true,
        lockedOnEdit: true,
        hint: 'Chọn giáo hạt trước. Muốn đổi giáo xứ của huynh trưởng, dùng "Chuyển giáo xứ" ở trang chi tiết.',
        options: parishOptions(true),
      },
      {
        name: 'leaderLevel',
        label: 'Cấp huynh trưởng',
        kind: 'select',
        required: true,
        lockedOnEdit: true,
        options: leaderLevelOptions,
      },
      {
        name: 'subjectConsentConfirmed',
        label:
          'Tôi xác nhận người có thông tin dưới đây đã được thông báo và đồng ý để hệ thống xử lý dữ liệu cá nhân của họ phục vụ quản lý hồ sơ huynh trưởng, đào tạo và cấp chứng nhận.',
        kind: 'switch',
        validate: (value) => (value === true ? null : 'Vui lòng xác nhận trước khi lưu'),
      },
    ],
    initialValues: (row) => ({
      holyName: row ? text(row, 'holyName') : '',
      fullName: row ? text(row, 'fullName') : '',
      birthDate: row ? text(row, 'birthDate') : '',
      gender: row ? text(row, 'gender') : '',
      phoneNumber: row ? text(row, 'phoneNumber') : '',
      email: row ? text(row, 'email') : '',
      deaneryId: row ? text(row, 'deaneryId') : '',
      parishId: row ? text(row, 'parishId') : '',
      leaderLevel: row ? text(row, 'leaderLevel') : '',
      subjectConsentConfirmed: false,
    }),
    toBody: (values, mode, row) => {
      if (mode === 'create') {
        return {
          holyName: trimmed(values, 'holyName'),
          fullName: trimmed(values, 'fullName'),
          birthDate: values.birthDate,
          gender: values.gender,
          email: optional(values, 'email'),
          phoneNumber: trimmed(values, 'phoneNumber'),
          leaderLevel: values.leaderLevel,
          parishId: values.parishId,
          subjectConsentConfirmed: true,
        };
      }
      // Sửa: chỉ tên thánh, giới tính, SĐT, email (như web). Xóa email là gửi clearFields.
      const clearsEmail = !optional(values, 'email') && Boolean(row && text(row, 'email'));
      return {
        holyName: trimmed(values, 'holyName'),
        gender: values.gender,
        phoneNumber: trimmed(values, 'phoneNumber'),
        email: optional(values, 'email'),
        clearFields: clearsEmail ? ['email'] : undefined,
        subjectConsentConfirmed: true,
      };
    },
    successCreate: 'Tạo mới thành công',
    successEdit: 'Lưu cập nhật thành công',
  },
  toggle: {
    isActive: (row) => flag(row, 'status'),
    label: (row) => (flag(row, 'status') ? 'Tạm ngưng hồ sơ' : 'Kích hoạt lại hồ sơ'),
    confirmMessage: (row) =>
      flag(row, 'status')
        ? 'Tạm ngưng hồ sơ huynh trưởng này. Gõ "Xác nhận" để tiếp tục.'
        : 'Kích hoạt lại hồ sơ huynh trưởng này. Gõ "Xác nhận" để tiếp tục.',
    requiresConfirmText: () => true,
    run: (gateway, row, input) =>
      gateway.call('PATCH', `/leaders/${encodeURIComponent(text(row, 'id'))}/toggle-status`, {
        body: { confirmationText: input.confirmText },
      }),
  },
  canCreate: (subject) => canCreateLeader(subject),
  canUpdate: (subject) => canUpdateLeader(subject),
  canToggle: (subject) => canToggleLeader(subject),
};
