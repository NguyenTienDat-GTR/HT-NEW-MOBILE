import {
  accountVariant,
  buildAccountBody,
  excludedRoleCodes,
  parseRoleChoice,
  setPrimaryRole,
  stringifyRoleChoice,
  toggleRole,
  EMPTY_ROLE_CHOICE,
} from './account-create';
import {
  buildAssignmentUpdateBody,
  buildBulkAssignBody,
  endOfDayIso,
  vnDate,
} from './account-role-body';

const user = (roles: string[]) => ({ roles, permissions: [] });

describe('tạo tài khoản', () => {
  it('quản trị hệ thống dùng kiểu cấp tài khoản toàn hệ thống, còn lại cấp cho huynh trưởng', () => {
    expect(accountVariant(user(['SUPER_ADMIN']))).toBe('super');
    expect(accountVariant(user(['ADMIN_DEANERY']))).toBe('leader');
  });

  it('vai trò không được chọn theo cấp của người tạo', () => {
    expect(excludedRoleCodes(user(['SUPER_ADMIN']))).toEqual(['ADMIN_DEANERY', 'ADMIN_PARISH']);
    expect(excludedRoleCodes(user(['ADMIN_DIOCESE']))).toEqual(['SUPER_ADMIN', 'ADMIN_DIOCESE']);
    expect(excludedRoleCodes(user(['ADMIN_DEANERY']))).toEqual([
      'SUPER_ADMIN',
      'ADMIN_DIOCESE',
      'ADMIN_DEANERY',
    ]);
    expect(excludedRoleCodes(user(['ADMIN_PARISH']))).toContain('ADMIN_PARISH');
  });

  it('chọn vai trò: tối đa 3, vai trò đầu là chính, bỏ vai trò chính thì chuyển sang vai trò còn lại', () => {
    let choice = toggleRole(EMPTY_ROLE_CHOICE, 'A');
    expect(choice).toEqual({ codes: ['A'], primary: 'A' });
    choice = toggleRole(toggleRole(choice, 'B'), 'C');
    expect(choice.codes).toEqual(['A', 'B', 'C']);
    expect(toggleRole(choice, 'D')).toBe(choice);
    choice = setPrimaryRole(choice, 'B');
    expect(choice.primary).toBe('B');
    expect(setPrimaryRole(choice, 'Z')).toBe(choice);
    expect(toggleRole(choice, 'B')).toEqual({ codes: ['A', 'C'], primary: 'A' });
  });

  it('lưu lựa chọn dạng chuỗi và đọc lại; dữ liệu hỏng thì rỗng', () => {
    const choice = { codes: ['A', 'B'], primary: 'B' };
    expect(parseRoleChoice(stringifyRoleChoice(choice))).toEqual(choice);
    expect(parseRoleChoice('không phải json')).toEqual(EMPTY_ROLE_CHOICE);
    expect(parseRoleChoice('{"codes":["A"],"primary":"X"}')).toEqual({ codes: ['A'], primary: '' });
  });

  it('kiểu hệ thống: gửi vai trò, giáo phận (chỉ cho admin giáo phận) và email nhận thông tin', () => {
    const ok = { roleCode: 'ADMIN_DIOCESE', dioceseId: 'd1', credentialEmail: ' a@x.vn ' };
    expect(buildAccountBody(ok, 'super')).toEqual({
      roleCode: 'ADMIN_DIOCESE',
      dioceseId: 'd1',
      credentialEmail: 'a@x.vn',
      subjectConsentConfirmed: true,
    });
    // Vai trò khác không gắn giáo phận.
    expect(
      buildAccountBody({ roleCode: 'CUSTOM', dioceseId: 'd1', credentialEmail: 'a@x.vn' }, 'super'),
    ).toMatchObject({ dioceseId: undefined });
  });

  it('kiểu huynh trưởng: gửi huynh trưởng, các vai trò và vai trò chính', () => {
    const roles = stringifyRoleChoice({ codes: ['A', 'B'], primary: 'B' });
    expect(buildAccountBody({ leaderId: 'l1', roles }, 'leader')).toEqual({
      leaderId: 'l1',
      roleCodes: ['A', 'B'],
      primaryRoleCode: 'B',
      subjectConsentConfirmed: true,
    });
    // Không chọn chính thì lấy vai trò đầu.
    const unset = stringifyRoleChoice({ codes: ['A'], primary: '' });
    expect(buildAccountBody({ leaderId: 'l1', roles: unset }, 'leader')).toMatchObject({
      primaryRoleCode: 'A',
    });
  });
});

describe('gán vai trò', () => {
  it('hạn dùng là cuối ngày giờ Việt Nam; ngày sai thì bỏ', () => {
    expect(endOfDayIso('2027-12-31')).toBe('2027-12-31T23:59:59+07:00');
    expect(endOfDayIso('')).toBeUndefined();
    expect(endOfDayIso('31/12/2027')).toBeUndefined();
  });

  it('đổi thời điểm của BE sang ngày giờ Việt Nam', () => {
    expect(vnDate('2027-12-31T16:59:59Z')).toBe('2027-12-31');
    expect(vnDate('2027-12-31T17:00:00Z')).toBe('2028-01-01');
    expect(vnDate('hỏng')).toBe('');
  });

  it('thân gán nhiều vai trò và thân sửa', () => {
    expect(
      buildBulkAssignBody({ username: ' ht.an ', roleCodes: ['A', 'B'], expiresAt: '2027-12-31' }),
    ).toEqual({ username: 'ht.an', roleCodes: ['A', 'B'], expiresAt: '2027-12-31T23:59:59+07:00' });
    expect(buildAssignmentUpdateBody({ isPrimary: true, expiresAt: '' })).toEqual({
      isPrimary: true,
      expiresAt: undefined,
    });
  });
});
