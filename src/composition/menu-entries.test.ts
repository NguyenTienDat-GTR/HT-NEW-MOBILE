import { visibleMenuSections } from './menu-entries';

const user = (permissions: string[], roles: string[] = ['ROLE_ADMIN_DEANERY']) => ({
  roles,
  permissions,
});
const labels = (u: ReturnType<typeof user> | null) =>
  visibleMenuSections(u).flatMap((s) => s.entries.map((e) => e.label));

describe('visibleMenuSections', () => {
  it('ẩn mục không có quyền và ẩn cả nhóm trống', () => {
    expect(labels(user([]))).toEqual([]);
    const sections = visibleMenuSections(
      user(['organization.parish.read.deanery', 'organization.leader.read.deanery']),
    );
    expect(sections.map((s) => s.group)).toEqual(['organization', 'leaders']);
    expect(labels(user(['organization.parish.read.deanery']))).toEqual(['Giáo xứ / họ / điểm']);
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
    expect(labels(user(['training.certificate.read.deanery']))).toEqual(['Danh sách chứng nhận']);
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
});
