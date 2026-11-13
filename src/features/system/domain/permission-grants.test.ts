import {
  buildAccountGrantBody,
  buildAccountGrantUpdateBody,
  buildRoleGrantBody,
  buildRoleGrantUpdateBody,
  canEditAccountPermissionRow,
  canEditRolePermissionRow,
  canRevokeAccountPermissionRow,
  canRevokeRolePermissionRow,
  filterPermissions,
  groupPermissions,
  parseSelection,
  revocationReasonText,
  stringifySelection,
  toggleCode,
  toggleGroup,
  validityLabel,
  type PermissionItem,
} from './permission-grants';

const user = (permissions: string[], roles: string[] = []) => ({ roles, permissions });
const perm = (code: string, name: string, resource: string, action = 'read'): PermissionItem => ({
  permissionCode: code,
  permissionName: name,
  moduleCode: 'training',
  resourceCode: resource,
  actionCode: action,
  scopeCode: 'deanery',
});

describe('quyền thao tác phân quyền', () => {
  const rolePerm = user([
    'system.role_permission.assign.deanery',
    'system.role_permission.revoke.deanery',
  ]);

  it('sửa hạn quyền của vai trò: cần quyền phân, quyền còn hiệu lực; vai trò hệ thống chỉ quản trị hệ thống', () => {
    expect(canEditRolePermissionRow(rolePerm, { validity: 'ACTIVE', roleCode: 'HT_XU' })).toBe(
      true,
    );
    expect(canEditRolePermissionRow(rolePerm, { validity: 'REVOKED', roleCode: 'HT_XU' })).toBe(
      false,
    );
    expect(
      canEditRolePermissionRow(rolePerm, { validity: 'ACTIVE', roleCode: 'ADMIN_PARISH' }),
    ).toBe(false);
    expect(canEditRolePermissionRow(rolePerm, { validity: 'ACTIVE', roleIsSystem: true })).toBe(
      false,
    );
    expect(
      canEditRolePermissionRow(user(['system.role_permission.assign.all'], ['SUPER_ADMIN']), {
        validity: 'ACTIVE',
        roleCode: 'ADMIN_PARISH',
      }),
    ).toBe(true);
    expect(
      canEditRolePermissionRow(user(['system.role_permission.read.deanery']), {
        validity: 'ACTIVE',
      }),
    ).toBe(false);
  });

  it('thu hồi quyền vai trò: cần quyền thu hồi và BE cho phép (revocable)', () => {
    expect(canRevokeRolePermissionRow(rolePerm, { validity: 'ACTIVE', revocable: true })).toBe(
      true,
    );
    expect(canRevokeRolePermissionRow(rolePerm, { validity: 'ACTIVE', revocable: false })).toBe(
      false,
    );
    expect(canRevokeRolePermissionRow(rolePerm, { validity: 'EXPIRED', revocable: true })).toBe(
      false,
    );
    expect(
      canRevokeRolePermissionRow(user(['system.role_permission.assign.deanery']), {
        validity: 'ACTIVE',
        revocable: true,
      }),
    ).toBe(false);
  });

  it('quyền của tài khoản: một quyền quản lý cho cả sửa và thu hồi', () => {
    const manager = user(['system.account_permission.manage.deanery']);
    expect(canEditAccountPermissionRow(manager, { validity: 'ACTIVE' })).toBe(true);
    expect(canEditAccountPermissionRow(manager, { validity: 'REVOKED' })).toBe(false);
    expect(canRevokeAccountPermissionRow(manager, { validity: 'ACTIVE', revocable: true })).toBe(
      true,
    );
    expect(canRevokeAccountPermissionRow(manager, { validity: 'ACTIVE' })).toBe(false);
    expect(canEditAccountPermissionRow(user([]), { validity: 'ACTIVE' })).toBe(false);
  });
});

describe('nhãn', () => {
  it('tình trạng quyền và lý do thu hồi', () => {
    expect(validityLabel('ACTIVE')).toEqual({ label: 'Còn hiệu lực', tone: 'success' });
    expect(validityLabel('REVOKED')?.tone).toBe('danger');
    expect(validityLabel('MOI')).toEqual({ label: 'MOI', tone: 'neutral' });
    expect(validityLabel(undefined)).toBeNull();
    expect(revocationReasonText('EXPIRED')).toBe('Hết hạn');
    expect(revocationReasonText('MANUAL')).toBe('Thu hồi thủ công');
  });
});

describe('chọn nhiều quyền', () => {
  const items = [
    perm('c.read', 'Xem khóa', 'course'),
    perm('c.update', 'Sửa khóa', 'course', 'update'),
    perm('p.read', 'Xem tham dự', 'participation'),
  ];

  it('lọc theo tên, mã và nhãn phân loại', () => {
    expect(filterPermissions(items, '').length).toBe(3);
    expect(filterPermissions(items, 'sửa').map((i) => i.permissionCode)).toEqual(['c.update']);
    expect(filterPermissions(items, 'p.read').length).toBe(1);
    expect(filterPermissions(items, 'tham dự khóa').map((i) => i.permissionCode)).toEqual([
      'p.read',
    ]);
  });

  it('nhóm theo phân hệ và đối tượng, xếp theo tên', () => {
    const groups = groupPermissions(items);
    expect(groups.map((g) => g.label)).toEqual([
      'Huấn luyện · Khóa huấn luyện',
      'Huấn luyện · Tham dự khóa',
    ]);
    expect(groups[0]!.items.map((i) => i.permissionName)).toEqual(['Sửa khóa', 'Xem khóa']);
  });

  it('tích từng quyền và cả nhóm; đã tích hết thì bỏ cả nhóm', () => {
    expect(toggleCode(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleCode(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleGroup(['a'], ['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(toggleGroup(['a', 'b', 'x'], ['a', 'b'])).toEqual(['x']);
  });

  it('lưu lựa chọn dạng chuỗi; dữ liệu hỏng thì rỗng', () => {
    expect(parseSelection(stringifySelection(['a', 'b']))).toEqual(['a', 'b']);
    expect(parseSelection('')).toEqual([]);
    expect(parseSelection('{"a":1}')).toEqual([]);
  });
});

describe('thân gửi', () => {
  it('phân quyền cho vai trò và cho tài khoản (lý do bắt buộc, hạn là cuối ngày giờ Việt Nam)', () => {
    expect(
      buildRoleGrantBody({ roleCode: ' HT_XU ', permissionCodes: ['a'], expiresAt: '2027-12-31' }),
    ).toEqual({
      roleCode: 'HT_XU',
      permissionCodes: ['a'],
      expiresAt: '2027-12-31T23:59:59+07:00',
    });
    expect(
      buildAccountGrantBody({
        username: 'ht.an',
        permissionCodes: ['a', 'b'],
        reason: ' Hỗ trợ tạm ',
        expiresAt: '',
      }),
    ).toEqual({
      username: 'ht.an',
      permissionCodes: ['a', 'b'],
      reason: 'Hỗ trợ tạm',
      expiresAt: undefined,
    });
  });

  it('sửa chỉ gửi hạn (vai trò) hoặc lý do và hạn (tài khoản)', () => {
    expect(buildRoleGrantUpdateBody('2027-01-01')).toEqual({
      expiresAt: '2027-01-01T23:59:59+07:00',
    });
    expect(buildAccountGrantUpdateBody({ reason: ' x ', expiresAt: '' })).toEqual({
      reason: 'x',
      expiresAt: undefined,
    });
  });
});
