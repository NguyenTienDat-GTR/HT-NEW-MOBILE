import { dashboardHref } from './dashboard-links';

const user = (permissions: string[]) => ({ roles: ['ROLE_ADMIN_DEANERY'], permissions });

const ALL = user([
  'training.participation.approve.deanery',
  'training.participation.score.deanery',
  'training.course.read.deanery',
  'training.certificate.approve.deanery',
  'organization.leader.read.deanery',
  'organization.parish.read.deanery',
]);

const filtersOf = (path: string | null) => {
  const raw = /[?&]filters=([^&]+)/.exec(path ?? '')?.[1];
  return raw ? (JSON.parse(decodeURIComponent(raw)) as Record<string, string>) : undefined;
};

describe('dashboardHref: lối tắt kèm bộ lọc từ tổng quan', () => {
  it('việc cần xử lý mở đúng màn với bộ lọc chọn sẵn', () => {
    const approvals = dashboardHref('pendingRegistrations', '/training/approvals', ALL);
    expect(approvals?.startsWith('/res/approvals?')).toBe(true);
    expect(filtersOf(approvals)).toEqual({ approvalStatus: 'PENDING' });
    expect(filtersOf(dashboardHref('rejectedRegistrations', '/training/approvals', ALL))).toEqual({
      approvalStatus: 'REJECTED',
    });
    expect(filtersOf(dashboardHref('pendingScoring', '/training/scores', ALL))).toEqual({
      result: 'UNCOMPLETED',
    });
    expect(filtersOf(dashboardHref('closingCourses', '/training/courses', ALL))).toEqual({
      registrationStatus: 'OPEN',
    });
    const certificates = dashboardHref('pendingCertificates', '/certificates/approvals', ALL);
    expect(certificates?.startsWith('/res/certificate-approvals?')).toBe(true);
    expect(filtersOf(certificates)).toEqual({ approvalStatus: 'PENDING' });
  });

  it('điểm cần chú ý có bộ lọc tương ứng; mục không có bộ lọc riêng chỉ mở màn', () => {
    expect(filtersOf(dashboardHref('stalePendingApprovals', '/training/approvals', ALL))).toEqual({
      approvalStatus: 'PENDING',
    });
    expect(filtersOf(dashboardHref('highRejectionRate', '/certificates/approvals', ALL))).toEqual({
      approvalStatus: 'REJECTED',
    });
    expect(filtersOf(dashboardHref('lowPassRateCourses', '/training/courses', ALL))).toEqual({
      organizingStatus: 'ENDED',
    });
    expect(dashboardHref('highCancellationCourses', '/training/courses', ALL)).toBe('/res/courses');
    expect(dashboardHref('lowActiveRate', '/leaders', ALL)).toBe('/res/leaders?status=inactive');
    expect(dashboardHref('inactiveUnits', '/organizations', ALL)).toBe(
      '/res/parishes?status=inactive',
    );
  });

  it('khóa mục lạ thì theo đường dẫn web của BE, không có bộ lọc', () => {
    expect(dashboardHref('moi', '/training/scores', ALL)).toBe('/res/scores');
    expect(dashboardHref('moi', '/khong-co', ALL)).toBeNull();
    expect(dashboardHref('moi', null, ALL)).toBeNull();
  });

  it('không có quyền xem màn đích thì không bấm được', () => {
    expect(dashboardHref('pendingRegistrations', '/training/approvals', user([]))).toBeNull();
    expect(
      dashboardHref('youthShortage', '/leaders', user(['training.course.read.deanery'])),
    ).toBeNull();
  });
});
