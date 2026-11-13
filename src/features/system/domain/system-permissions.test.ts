import {
  canResetPasswordRow,
  canToggleAccountRow,
  canToggleRoleRow,
  canUpdateRoleRow,
  rowHasRole,
} from './system-permissions';

const user = (permissions: string[], roles: string[] = [], username = 'admin') => ({
  roles,
  permissions,
  username,
});

describe('quyền thao tác tài khoản', () => {
  const manager = user(['system.account.manage.diocese', 'system.account.reset_password.diocese']);

  it('không bật/tắt tài khoản của chính mình hay tài khoản quản trị hệ thống', () => {
    expect(canToggleAccountRow(manager, { username: 'ht.an', status: true })).toBe(true);
    expect(canToggleAccountRow(manager, { username: 'admin' })).toBe(false);
    expect(canToggleAccountRow(manager, { username: 'root', primaryRoleCode: 'SUPER_ADMIN' })).toBe(
      false,
    );
    expect(
      canToggleAccountRow(manager, {
        username: 'root2',
        roleCodes: ['ADMIN_PARISH', 'SUPER_ADMIN'],
      }),
    ).toBe(false);
  });

  it('đặt lại mật khẩu: chỉ tài khoản đang hoạt động của người khác, cần quyền riêng', () => {
    expect(canResetPasswordRow(manager, { username: 'ht.an', status: true })).toBe(true);
    expect(canResetPasswordRow(manager, { username: 'ht.an', status: false })).toBe(false);
    expect(canResetPasswordRow(manager, { username: 'admin', status: true })).toBe(false);
    expect(
      canResetPasswordRow(user(['system.account.manage.diocese']), {
        username: 'ht.an',
        status: true,
      }),
    ).toBe(false);
  });

  it('rowHasRole tính cả vai trò chính lẫn vai trò phụ', () => {
    expect(rowHasRole({ primaryRoleCode: 'A' }, 'A')).toBe(true);
    expect(rowHasRole({ roleCodes: ['B', 'C'] }, 'C')).toBe(true);
    expect(rowHasRole({ roleCodes: ['B'] }, 'A')).toBe(false);
  });
});

describe('quyền thao tác vai trò', () => {
  const editor = user(['system.role.update.diocese', 'system.role.toggle.diocese']);
  const root = user(['system.role.update.all', 'system.role.toggle.all'], ['SUPER_ADMIN']);

  it('vai trò hệ thống chỉ quản trị hệ thống sửa được', () => {
    expect(canUpdateRoleRow(editor, { isSystem: false })).toBe(true);
    expect(canUpdateRoleRow(editor, { isSystem: true })).toBe(false);
    expect(canUpdateRoleRow(root, { isSystem: true })).toBe(true);
  });

  it('bật/tắt vai trò: không áp dụng cho vai trò hệ thống, và quản trị hệ thống không bật/tắt vai trò', () => {
    expect(canToggleRoleRow(editor, { isSystem: false })).toBe(true);
    expect(canToggleRoleRow(editor, { isSystem: true })).toBe(false);
    expect(canToggleRoleRow(root, { isSystem: false })).toBe(false);
  });
});
