import { stringifyRoleChoice } from '../domain/account-create';
import { stringifySelection } from '../domain/permission-grants';

import { accountRolesResource } from './account-roles-resource';
import { accountsResource } from './accounts-resource';
import { auditLogsResource } from './audit-logs-resource';
import { accountPermissionsResource, rolePermissionsResource } from './permission-grants-resources';
import { permissionsResource } from './permissions-resource';
import { rolesResource } from './roles-resource';

const superAdmin = { roles: ['SUPER_ADMIN'], permissions: ['system.account.manage.all'] };
const deanery = { roles: ['ADMIN_DEANERY'], permissions: ['system.account.manage.deanery'] };

describe('tài khoản', () => {
  const form = accountsResource.form!;

  it('kiểu form theo người tạo và danh sách vai trò bị loại', () => {
    expect(form.initialValues(null, superAdmin)).toMatchObject({
      variant: 'super',
      excludedRoles: 'ADMIN_DEANERY,ADMIN_PARISH',
    });
    expect(form.initialValues(null, deanery)).toMatchObject({
      variant: 'leader',
      excludedRoles: 'SUPER_ADMIN,ADMIN_DIOCESE,ADMIN_DEANERY',
    });
  });

  it('chỉ hiện các ô đúng kiểu: hệ thống có email nhận thông tin, huynh trưởng có ô chọn huynh trưởng', () => {
    const visible = (variant: string, values: Record<string, string | boolean> = {}) =>
      form.fields
        .filter((field) => (field.visible ? field.visible({ variant, ...values }, 'create') : true))
        .map((field) => field.name);
    expect(visible('super')).toEqual(['roleCode', 'credentialEmail', 'subjectConsentConfirmed']);
    expect(visible('super', { roleCode: 'ADMIN_DIOCESE' })).toContain('dioceseId');
    expect(visible('leader')).toEqual(['leaderId', 'roles', 'subjectConsentConfirmed']);
  });

  it('thân gửi theo kiểu form', () => {
    const roles = stringifyRoleChoice({ codes: ['A', 'B'], primary: 'B' });
    expect(
      form.toBody({ variant: 'leader', leaderId: 'l1', roles }, 'create', null, deanery),
    ).toEqual({
      leaderId: 'l1',
      roleCodes: ['A', 'B'],
      primaryRoleCode: 'B',
      subjectConsentConfirmed: true,
    });
  });

  it('người tạo không có quyền quản lý tài khoản thì không thấy nút tạo; không có sửa tài khoản', () => {
    expect(accountsResource.canCreate({ roles: [], permissions: [] })).toBe(false);
    expect(accountsResource.canCreate(deanery)).toBe(true);
    expect(accountsResource.canUpdate(deanery, {})).toBe(false);
  });
});

describe('vai trò', () => {
  const form = rolesResource.form!;

  it('tạo gửi mã vai trò; sửa không gửi mã', () => {
    const values = {
      roleCode: ' KY_THUAT ',
      roleName: ' Kỹ thuật ',
      description: '',
      displayOrder: '5',
    };
    expect(form.toBody(values, 'create', null, null)).toEqual({
      roleCode: 'KY_THUAT',
      roleName: 'Kỹ thuật',
      description: undefined,
      displayOrder: 5,
    });
    expect(form.toBody(values, 'edit', {}, null)).not.toHaveProperty('roleCode');
  });

  it('thứ tự phải là số nguyên không âm', () => {
    const field = form.fields.find((item) => item.name === 'displayOrder')!;
    expect(field.validate!('abc', {}, 'create')).toBe('Thứ tự là số nguyên không âm');
    expect(field.validate!('12', {}, 'create')).toBeNull();
    expect(field.validate!('', {}, 'create')).toBeNull();
  });
});

describe('gán vai trò', () => {
  const form = accountRolesResource.form!;

  it('tạo gán nhiều vai trò một lần; sửa chỉ đổi vai trò chính và hạn', () => {
    const roles = stringifyRoleChoice({ codes: ['A', 'B'], primary: 'A' });
    expect(
      form.toBody({ username: 'ht.an', roles, expiresAt: '2027-12-31' }, 'create', null, null),
    ).toEqual({
      username: 'ht.an',
      roleCodes: ['A', 'B'],
      expiresAt: '2027-12-31T23:59:59+07:00',
    });
    expect(form.toBody({ isPrimary: true, expiresAt: '' }, 'edit', { id: 'x' }, null)).toEqual({
      isPrimary: true,
      expiresAt: undefined,
    });
  });

  it('khi sửa: hiện tài khoản và vai trò (khóa), không hiện ô chọn tài khoản và danh sách vai trò', () => {
    const names = (mode: 'create' | 'edit') =>
      form.fields
        .filter((field) => (field.visible ? field.visible({}, mode) : true))
        .map((field) => field.name);
    expect(names('edit')).toEqual(['accountView', 'roleView', 'isPrimary', 'expiresAt']);
    expect(names('create')).toEqual(['username', 'roles', 'expiresAt']);
  });
});

describe('quyền hạn và nhật ký chỉ để xem', () => {
  it('không có thao tác ghi', () => {
    for (const def of [permissionsResource, auditLogsResource]) {
      expect(def.canCreate(superAdmin)).toBe(false);
      expect(def.canUpdate(superAdmin, {})).toBe(false);
      expect(def.canToggle(superAdmin, {})).toBe(false);
    }
  });

  it('thẻ nhật ký: thao tác, đối tượng, người thực hiện và kết quả', () => {
    const card = auditLogsResource.card({
      operation: 'REVOKE',
      resource: 'certificate',
      resourceName: 'GPPC-HTI-2027-1',
      username: 'admin.hat',
      loggedAt: '2027-03-12T03:00:00Z',
      statusCode: 403,
    });
    expect(card.title).toBe('Thu hồi · Chứng nhận');
    expect(card.subtitle).toBe('GPPC-HTI-2027-1');
    expect(card.badges?.map((badge) => badge.label)).toEqual(['Thu hồi', 'Không đủ quyền']);
  });
});

describe('phân quyền', () => {
  const rolePerm = rolePermissionsResource.form!;
  const accountPerm = accountPermissionsResource.form!;
  const picked = stringifySelection(['a', 'b']);

  it('vai trò: tạo gửi nhiều quyền một lần, sửa chỉ gửi hạn', () => {
    expect(
      rolePerm.toBody(
        { roleCode: 'HT_XU', permissions: picked, expiresAt: '' },
        'create',
        null,
        null,
      ),
    ).toEqual({ roleCode: 'HT_XU', permissionCodes: ['a', 'b'], expiresAt: undefined });
    expect(rolePerm.toBody({ expiresAt: '2027-01-01' }, 'edit', { id: '1' }, null)).toEqual({
      expiresAt: '2027-01-01T23:59:59+07:00',
    });
  });

  it('tài khoản: tạo cần lý do; sửa gửi lý do và hạn', () => {
    expect(
      accountPerm.toBody(
        { username: 'ht.an', permissions: picked, reason: ' Hỗ trợ ', expiresAt: '' },
        'create',
        null,
        null,
      ),
    ).toEqual({
      username: 'ht.an',
      permissionCodes: ['a', 'b'],
      reason: 'Hỗ trợ',
      expiresAt: undefined,
    });
    const reason = accountPerm.fields.find((field) => field.name === 'reason')!;
    expect(reason.required).toBe(true);
    expect(accountPerm.toBody({ reason: 'x', expiresAt: '' }, 'edit', { id: '1' }, null)).toEqual({
      reason: 'x',
      expiresAt: undefined,
    });
  });

  it('tạo bắt buộc chọn ít nhất một quyền; sửa không hiện ô chọn quyền', () => {
    const field = rolePerm.fields.find((item) => item.name === 'permissions')!;
    expect(field.validate!('', {}, 'create')).toBe('Chọn ít nhất một quyền');
    expect(field.validate!(picked, {}, 'create')).toBeNull();
    expect(field.visible!({}, 'edit')).toBe(false);
  });

  it('quyền thao tác theo tiền tố quyền; không bật/tắt', () => {
    const assigner = { roles: [], permissions: ['system.role_permission.assign.deanery'] };
    expect(rolePermissionsResource.canCreate(assigner)).toBe(true);
    expect(rolePermissionsResource.canCreate({ roles: [], permissions: [] })).toBe(false);
    expect(rolePermissionsResource.canToggle(assigner, {})).toBe(false);
    expect(
      accountPermissionsResource.canUpdate({ roles: [], permissions: [] }, { validity: 'ACTIVE' }),
    ).toBe(false);
  });
});
