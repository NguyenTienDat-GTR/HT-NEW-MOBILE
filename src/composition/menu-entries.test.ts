import { visibleMenuSections } from './menu-entries';

const user = (permissions: string[], roles: string[] = ['ROLE_ADMIN_DEANERY']) => ({
  roles,
  permissions,
});
const labels = (u: ReturnType<typeof user> | null) =>
  visibleMenuSections(u).flatMap((s) => s.entries.map((e) => e.label));

describe('visibleMenuSections', () => {
  it('đơn vị bị khóa thì ẩn mọi mục dù còn quyền (như web)', () => {
    const locked = { ...user(['organization.parish.read.deanery']), unitLocked: true };
    expect(visibleMenuSections(locked)).toEqual([]);
  });

  it('ẩn mục không có quyền và ẩn cả nhóm trống', () => {
    expect(labels(user([]))).toEqual([]);
    const sections = visibleMenuSections(
      user(['organization.parish.read.deanery', 'organization.leader.read.deanery']),
    );
    expect(sections.map((s) => s.group)).toEqual(['organization', 'leaders']);
    expect(labels(user(['organization.parish.read.deanery']))).toEqual([
      'Giáo xứ, giáo họ, giáo điểm',
    ]);
  });

  it('phân công ban điều hành hiện với một trong hai tiền tố quyền', () => {
    expect(labels(user(['organization.executive_board.read.parish']))).toEqual([
      'Phân công ban điều hành',
    ]);
    expect(labels(user(['organization.executive_board_assignment.read.parish']))).toEqual([
      'Phân công ban điều hành',
    ]);
  });

  it('SUPER_ADMIN không thấy huynh trưởng và ban điều hành dù có quyền, vẫn thấy tổ chức và cấp độ', () => {
    const admin = user(
      [
        'organization.diocese.read.all',
        'organization.leader.read.all',
        'organization.position.read.all',
        'system.leader_level.read.all',
      ],
      ['SUPER_ADMIN'],
    );
    expect(labels(admin)).toEqual(['Giáo phận', 'Cấp độ huynh trưởng']);
  });

  it('chưa đăng nhập thì không có mục nào', () => {
    expect(labels(null)).toEqual([]);
  });

  it('chứng nhận: xem danh sách khi có quyền đọc, mục duyệt chỉ hiện khi có quyền duyệt', () => {
    expect(labels(user(['training.certificate.read.deanery']))).toEqual([
      'Chứng nhận',
      'Duyệt chứng nhận',
    ]);
    expect(labels(user(['training.certificate.approve.diocese']))).toEqual(['Duyệt chứng nhận']);
    expect(
      visibleMenuSections(
        user(['training.certificate.read.deanery', 'training.certificate.approve.deanery']),
      ).map((s) => s.group),
    ).toEqual(['certificates']);
  });

  it('SUPER_ADMIN không thấy chứng nhận dù có quyền', () => {
    expect(labels(user(['training.certificate.read.all'], ['SUPER_ADMIN']))).toEqual([]);
  });

  it('hệ thống: mỗi mục theo quyền riêng; quản trị hệ thống vẫn thấy', () => {
    expect(labels(user(['system.audit_log.read.diocese']))).toEqual(['Nhật ký hệ thống']);
    expect(labels(user(['system.account_role.assign.deanery']))).toEqual(['Gán vai trò']);
    expect(labels(user(['system.permission.manage.all']))).toEqual(['Quyền hạn']);
    expect(
      labels(user(['system.account.manage.all', 'system.role.read.all'], ['SUPER_ADMIN'])),
    ).toEqual(['Tài khoản', 'Vai trò']);
  });

  it('phân quyền: vai trò cần một trong ba quyền xem/phân/thu hồi, tài khoản cần quyền quản lý', () => {
    expect(labels(user(['system.role_permission.revoke.deanery']))).toEqual(['Phân quyền vai trò']);
    expect(labels(user(['system.role_permission.read.parish']))).toEqual(['Phân quyền vai trò']);
    expect(labels(user(['system.account_permission.manage.diocese']))).toEqual([
      'Phân quyền tài khoản',
    ]);
  });
});
