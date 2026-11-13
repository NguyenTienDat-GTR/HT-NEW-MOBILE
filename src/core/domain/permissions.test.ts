import { canReadRoute, hasPermissionPrefix, hasRole, isSuperAdmin } from './permissions';

const admin = {
  roles: ['ROLE_ADMIN_DEANERY'],
  permissions: ['training.course.read.deanery', 'analytics.dashboard.read.deanery'],
};
const superAdmin = {
  roles: ['SUPER_ADMIN'],
  permissions: ['training.course.read.all', 'system.account.manage.all'],
};

describe('permissions', () => {
  it('hasRole chấp nhận cả dạng có tiền tố ROLE_', () => {
    expect(hasRole(admin, 'ADMIN_DEANERY')).toBe(true);
    expect(hasRole(admin, 'ADMIN_PARISH')).toBe(false);
  });

  it('hasPermissionPrefix xét theo tiền tố mã quyền', () => {
    expect(hasPermissionPrefix(admin, 'training.course.read.')).toBe(true);
    expect(hasPermissionPrefix(admin, 'system.')).toBe(false);
    expect(hasPermissionPrefix(null, 'x')).toBe(false);
  });

  it('canReadRoute: cần ít nhất một quyền của màn hình; màn không đòi quyền thì ai cũng thấy', () => {
    expect(
      canReadRoute(
        { moduleName: 'training.courses', permissionPrefixes: ['training.course.read.'] },
        admin,
      ),
    ).toBe(true);
    expect(
      canReadRoute(
        { moduleName: 'system.accounts', permissionPrefixes: ['system.account.manage.'] },
        admin,
      ),
    ).toBe(false);
    expect(canReadRoute({ moduleName: 'notifications', permissionPrefixes: [] }, admin)).toBe(true);
  });

  it('SUPER_ADMIN không thấy các module nghiệp vụ huấn luyện/chứng nhận dù có quyền', () => {
    expect(isSuperAdmin(superAdmin)).toBe(true);
    expect(
      canReadRoute(
        { moduleName: 'training.courses', permissionPrefixes: ['training.course.read.'] },
        superAdmin,
      ),
    ).toBe(false);
    expect(
      canReadRoute(
        { moduleName: 'system.accounts', permissionPrefixes: ['system.account.manage.'] },
        superAdmin,
      ),
    ).toBe(true);
  });
});
