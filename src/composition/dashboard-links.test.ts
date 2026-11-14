import { dashboardHref } from './dashboard-links';

const user = (permissions: string[]) => ({ roles: ['ROLE_ADMIN_DEANERY'], permissions });

describe('dashboardHref: lối tắt từ tổng quan', () => {
  it('đổi đường dẫn web sang màn mobile khi có quyền xem', () => {
    const deanery = user([
      'training.participation.approve.deanery',
      'training.participation.score.deanery',
      'training.course.read.deanery',
      'training.certificate.approve.deanery',
      'organization.leader.read.deanery',
      'organization.parish.read.deanery',
    ]);
    expect(dashboardHref('/training/approvals', deanery)).toBe('/res/approvals');
    expect(dashboardHref('/training/scores', deanery)).toBe('/res/scores');
    expect(dashboardHref('/training/courses', deanery)).toBe('/res/courses');
    expect(dashboardHref('/certificates/approvals', deanery)).toBe('/res/certificate-approvals');
    expect(dashboardHref('/leaders', deanery)).toBe('/res/leaders');
    expect(dashboardHref('/organizations', deanery)).toBe('/res/parishes');
  });

  it('không có quyền xem màn đích thì không bấm được', () => {
    expect(dashboardHref('/training/approvals', user([]))).toBeNull();
    expect(dashboardHref('/leaders', user(['training.course.read.deanery']))).toBeNull();
  });

  it('href lạ, rỗng hoặc có query vẫn xử lý an toàn', () => {
    expect(dashboardHref('/khong-co', user([]))).toBeNull();
    expect(dashboardHref('', user([]))).toBeNull();
    expect(dashboardHref(null, user([]))).toBeNull();
    expect(dashboardHref('/training/courses?tab=x', user(['training.course.read.parish']))).toBe(
      '/res/courses',
    );
  });
});
