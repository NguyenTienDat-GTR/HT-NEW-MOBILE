import { toOpenCourse, toRecordsPage, toReport, toWorkQueueItem } from './analytics-mapper';

describe('analytics mapper', () => {
  it('chuẩn hóa báo cáo thiếu trường thành giá trị an toàn (không bao giờ ném)', () => {
    const report = toReport({});
    expect(report.scope).toBe('parish');
    expect(report.kpis).toEqual([]);
    expect(report.filters).toMatchObject({
      timeBucket: 'month',
      compareFromDate: null,
      includeInactiveUnits: false,
    });
  });

  it('giữ số liệu KPI, phân nhóm, phễu, cảnh báo', () => {
    const report = toReport({
      scope: 'deanery',
      kpis: [
        { key: 'passRate', unit: 'PERCENT', value: 80, delta: 2, numerator: 8, denominator: 10 },
      ],
      breakdowns: [{ type: 'course', key: 'K1', label: 'Khóa 1', metrics: { registrations: 4 } }],
      funnel: [{ key: 'registered', count: 10 }],
      alerts: [
        {
          key: 'scoringOverdue',
          severity: 'warning',
          count: 3,
          items: [{ label: 'HT A', value: 2 }],
        },
      ],
    });
    expect(report.kpis[0]).toMatchObject({
      key: 'passRate',
      value: 80,
      previous: null,
      deltaPct: null,
    });
    expect(report.breakdowns[0]?.metrics.registrations).toBe(4);
    expect(report.funnel[0]).toMatchObject({ count: 10, rateOfPrevious: null });
    expect(report.alerts[0]?.items[0]).toEqual({ id: null, label: 'HT A', value: 2 });
  });

  it('khóa mở, việc cần xử lý, hồ sơ', () => {
    expect(toOpenCourse({ courseCode: 'K1' })).toMatchObject({
      courseName: 'K1',
      urgency: 'open',
      registeredLeaders: 0,
    });
    expect(toWorkQueueItem({ key: 'pendingRegistrations' })).toEqual({
      key: 'pendingRegistrations',
      href: '',
      count: 0,
      severity: 'none',
    });
    expect(toRecordsPage({ rows: [{ id: 'a' }], total: 31 }, 2, 15)).toMatchObject({
      page: 2,
      size: 15,
      total: 31,
      columns: [],
    });
  });
});
