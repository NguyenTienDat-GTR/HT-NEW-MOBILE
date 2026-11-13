import { formatDateTime } from '@/core/domain/date-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { loadOptions } from '@/shared/resource/options';
import { flag, joinParts, text } from '@/shared/resource/row';
import type {
  DetailSection,
  ListFilterDef,
  ResourceDefinition,
  ResourceGateway,
  SelectOption,
} from '@/shared/resource/types';

import {
  accountVariant,
  buildAccountBody,
  excludedRoleCodes,
  parseRoleChoice,
  type AccountVariant,
} from '../domain/account-create';
import {
  canManageAccounts,
  canToggleAccountRow,
  type SystemSubject,
} from '../domain/system-permissions';

import { AccountActions } from './AccountActions';
import { AccountRolesField } from './AccountRolesFields';

const encode = (row: ResourceRow) => encodeURIComponent(text(row, 'username'));

const leaderName = (row: ResourceRow) =>
  joinParts([text(row, 'leaderHolyName'), text(row, 'leaderFullName')], ' ');

const unitName = (row: ResourceRow) =>
  joinParts([
    text(row, 'leaderParishName') || text(row, 'parishName'),
    text(row, 'deaneryName'),
    text(row, 'dioceseName'),
  ]);

const statusBadge = (row: ResourceRow) =>
  flag(row, 'status')
    ? { label: 'Đang hoạt động', tone: 'success' as const }
    : { label: 'Tạm ngưng', tone: 'warning' as const };

function accountDetail(row: ResourceRow): DetailSection[] {
  const others = Array.isArray(row.secondaryRoleNames) ? row.secondaryRoleNames.map(String) : [];
  return [
    {
      title: 'Tài khoản',
      fields: [
        { label: 'Tên đăng nhập', value: text(row, 'username') },
        { label: 'Email', value: text(row, 'email') },
        { label: 'Vai trò chính', value: text(row, 'primaryRoleName') },
        { label: 'Vai trò khác', value: others.join(', ') },
        { label: 'Trạng thái', value: flag(row, 'status') ? 'Đang hoạt động' : 'Tạm ngưng' },
      ],
    },
    {
      title: 'Huynh trưởng liên kết',
      fields: [
        { label: 'Họ tên', value: leaderName(row) },
        { label: 'Giáo xứ', value: text(row, 'leaderParishName') },
        { label: 'Giáo họ / giáo điểm', value: text(row, 'leaderSubUnitName') },
      ],
    },
    {
      title: 'Đơn vị quản lý',
      fields: [
        { label: 'Giáo phận', value: text(row, 'dioceseName') },
        { label: 'Giáo hạt', value: text(row, 'deaneryName') },
        { label: 'Giáo xứ', value: text(row, 'parishName') },
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
  ];
}

const roleFilter: ListFilterDef = {
  key: 'roleCode',
  label: 'Vai trò',
  options: {
    load: ({ gateway }) =>
      loadOptions(gateway, '/system/roles', { value: 'roleCode', label: 'roleName' }),
  },
};

const unitFilters: ListFilterDef[] = [
  {
    key: 'deanery.id',
    label: 'Giáo hạt',
    options: {
      load: ({ gateway }) => loadOptions(gateway, '/deaneries', { value: 'id', label: 'name' }),
    },
  },
  {
    key: 'parish.id',
    label: 'Giáo xứ / họ / điểm',
    dependsOn: ['deanery.id'],
    options: {
      dependsOn: ['deanery.id'],
      load: ({ gateway, values }) => {
        const deanery = String(values['deanery.id'] ?? '');
        return loadOptions(
          gateway,
          '/parishes',
          { value: 'id', label: 'name' },
          { filters: deanery ? { 'deanery.id': deanery } : {} },
        );
      },
    },
  },
];

const variantOf = (values: Record<string, string | boolean>): AccountVariant =>
  values.variant === 'super' ? 'super' : 'leader';

const isSuperForm = (values: Record<string, string | boolean>) => variantOf(values) === 'super';

/** Huynh trưởng chưa có tài khoản (BE đã giới hạn theo phạm vi quản lý của người tạo). */
async function searchCandidates(gateway: ResourceGateway, term: string): Promise<SelectOption[]> {
  const rows = await gateway.call<ResourceRow[]>('GET', '/leaders/account-candidates', {
    query: { search: term, page: 0, size: 20 },
  });
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    value: text(row, 'id'),
    label: joinParts([
      joinParts([text(row, 'holyName'), text(row, 'fullName')], ' '),
      text(row, 'subUnitName'),
    ]),
  }));
}

/** Tài khoản: danh sách, chi tiết, tạo (hai kiểu như web), bật/tắt và đặt lại mật khẩu tạm. Không sửa được tài khoản. */
export const accountsResource: ResourceDefinition = {
  id: 'accounts',
  title: 'Tài khoản',
  singular: 'Tài khoản',
  endpoint: '/system/accounts',
  idField: 'username',
  searchFields: ['username', 'leaderFullName', 'primaryRoleCode', 'dioceseName'],
  searchPlaceholder: 'Tên đăng nhập, huynh trưởng, vai trò',
  statusFilter: true,
  filters: [roleFilter, ...unitFilters],
  card: (row) => ({
    title: leaderName(row) || text(row, 'username'),
    subtitle: joinParts([text(row, 'username'), text(row, 'primaryRoleName')]),
    lines: [unitName(row)],
    badges: [statusBadge(row)],
  }),
  detailTitle: (row) => leaderName(row) || text(row, 'username'),
  detailBadges: (row) => [statusBadge(row)],
  detail: accountDetail,
  renderDetailExtra: ({ row, subject }) => <AccountActions row={row} subject={subject} />,
  form: {
    titleCreate: 'Tạo tài khoản',
    titleEdit: 'Tài khoản',
    sections: [
      {
        title: 'Thông tin tài khoản',
        fields: [
          'roleCode',
          'dioceseId',
          'credentialEmail',
          'leaderId',
          'roles',
          'subjectConsentConfirmed',
        ],
      },
    ],
    fields: [
      {
        name: 'roleCode',
        label: 'Vai trò',
        kind: 'select',
        required: true,
        visible: isSuperForm,
        resets: ['dioceseId'],
        options: {
          load: async ({ gateway, subject }) => {
            const excluded = excludedRoleCodes(subject);
            const options = await loadOptions(gateway, '/system/roles', {
              value: 'roleCode',
              label: 'roleName',
            });
            return options.filter((option) => !excluded.includes(option.value));
          },
        },
      },
      {
        name: 'dioceseId',
        label: 'Giáo phận trực thuộc',
        kind: 'select',
        required: true,
        visible: (values) => isSuperForm(values) && values.roleCode === 'ADMIN_DIOCESE',
        options: {
          load: ({ gateway }) => loadOptions(gateway, '/dioceses', { value: 'id', label: 'name' }),
        },
      },
      {
        name: 'credentialEmail',
        label: 'Email nhận thông tin đăng nhập',
        kind: 'email',
        required: true,
        maxLength: 100,
        hint: 'Có thể trùng với email của tài khoản khác. Tên đăng nhập được sinh từ phần trước @.',
        visible: isSuperForm,
      },
      {
        name: 'leaderId',
        label: 'Huynh trưởng liên kết',
        kind: 'lookup',
        required: true,
        visible: (values) => !isSuperForm(values),
        lookup: {
          placeholder: 'Gõ tên thánh, họ tên, email hoặc số điện thoại…',
          search: searchCandidates,
        },
      },
      {
        name: 'roles',
        label: 'Vai trò',
        kind: 'custom',
        visible: (values) => !isSuperForm(values),
        validate: (value) =>
          parseRoleChoice(String(value)).codes.length > 0 ? null : 'Chọn ít nhất một vai trò',
        render: (props) => <AccountRolesField {...props} />,
      },
      {
        name: 'subjectConsentConfirmed',
        label:
          'Tôi xác nhận người sở hữu tài khoản này đã được thông báo và đồng ý để hệ thống xử lý dữ liệu cá nhân của họ phục vụ quản lý tài khoản.',
        kind: 'switch',
        validate: (value) => (value === true ? null : 'Vui lòng xác nhận trước khi lưu'),
      },
    ],
    initialValues: (_row, subject) => ({
      variant: accountVariant(subject),
      excludedRoles: excludedRoleCodes(subject).join(','),
      roleCode: '',
      dioceseId: '',
      credentialEmail: '',
      leaderId: '',
      roles: '',
      subjectConsentConfirmed: false,
    }),
    toBody: (values) => buildAccountBody(values, variantOf(values)),
    successCreate: 'Tạo tài khoản thành công',
  },
  toggle: {
    isActive: (row) => flag(row, 'status'),
    label: (row) => (flag(row, 'status') ? 'Tạm ngưng tài khoản' : 'Kích hoạt lại tài khoản'),
    confirmMessage: (row) =>
      flag(row, 'status')
        ? 'Tài khoản tạm ngưng sẽ không đăng nhập được. Bạn có thể kích hoạt lại sau.'
        : 'Tài khoản được kích hoạt lại và đăng nhập được bình thường.',
    run: (gateway, row) =>
      gateway.call('PATCH', `/system/accounts/${encode(row)}/toggle-status`, {
        body: { confirmationText: 'Xác nhận' },
      }),
  },
  canCreate: (subject) => canManageAccounts(subject as SystemSubject | null),
  canUpdate: () => false,
  canToggle: (subject, row) => canToggleAccountRow(subject as SystemSubject | null, row),
};
