import {
  DEFAULT_FILTERS,
  activeFilterCount,
  buildAnalyticsQuery,
  effectiveRange,
  presetLabel,
  resolvePreset,
  withResolvedRange,
} from './filters';
import {
  deadlineText,
  deltaTone,
  formatDelta,
  formatKpiValue,
  keyLabel,
  snapshotFootnote,
} from './labels';
import { formatRecordValue } from './record-format';
import { formatPeriod, toChartRows } from './selectors';

// 13/11/2026 (giữa năm tính theo quý 4)
const today = new Date(2026, 10, 13);

describe('resolvePreset', () => {
  it('quy preset ra khoảng ngày cụ thể', () => {
    expect(resolvePreset('last30Days', today)).toEqual({
      fromDate: '2026-10-15',
      toDate: '2026-11-13',
    });
    expect(resolvePreset('thisMonth', today)).toEqual({
      fromDate: '2026-11-01',
      toDate: '2026-11-30',
    });
    expect(resolvePreset('lastMonth', today)).toEqual({
      fromDate: '2026-10-01',
      toDate: '2026-10-31',
    });
    expect(resolvePreset('thisQuarter', today)).toEqual({
      fromDate: '2026-10-01',
      toDate: '2026-12-31',
    });
    expect(resolvePreset('lastQuarter', today)).toEqual({
      fromDate: '2026-07-01',
      toDate: '2026-09-30',
    });
    expect(resolvePreset('thisYear', today)).toEqual({
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
    });
    expect(resolvePreset('lastYear', today)).toEqual({
      fromDate: '2025-01-01',
      toDate: '2025-12-31',
    });
  });

  it('12 tháng qua trả rỗng để BE dùng mặc định; custom giữ ngày đã nhập', () => {
    expect(resolvePreset('last12Months', today)).toEqual({ fromDate: '', toDate: '' });
    const custom = {
      ...DEFAULT_FILTERS,
      preset: 'custom' as const,
      fromDate: '2026-01-01',
      toDate: '2026-02-01',
    };
    expect(withResolvedRange(custom, today)).toBe(custom);
  });
});

describe('buildAnalyticsQuery', () => {
  it('bộ lọc mặc định sinh query rỗng (cùng khóa cache)', () => {
    expect(buildAnalyticsQuery(withResolvedRange(DEFAULT_FILTERS, today))).toEqual({});
  });

  it('chỉ gửi giá trị khác mặc định và nối tham số mở rộng', () => {
    const query = buildAnalyticsQuery(
      withResolvedRange(
        {
          ...DEFAULT_FILTERS,
          preset: 'thisYear',
          timeBucket: 'quarter',
          compare: false,
          deaneryId: 'D1',
          gender: 'NU',
          includeInactiveUnits: true,
        },
        today,
      ),
      { dataset: 'leaders', page: 2, value: '' },
    );
    expect(query).toEqual({
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
      timeBucket: 'quarter',
      deaneryId: 'D1',
      gender: 'NU',
      compare: 'false',
      includeInactiveUnits: 'true',
      dataset: 'leaders',
      page: '2',
    });
  });
});

describe('activeFilterCount / presetLabel', () => {
  it('đếm bộ lọc đang bật', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(
      activeFilterCount({
        ...DEFAULT_FILTERS,
        preset: 'thisYear',
        deaneryId: 'D1',
        compare: false,
      }),
    ).toBe(3);
  });

  it('nhãn khoảng thời gian', () => {
    expect(presetLabel(DEFAULT_FILTERS)).toBe('12 tháng qua');
    expect(presetLabel({ ...DEFAULT_FILTERS, preset: 'thisQuarter' })).toBe('Quý này');
  });
});

describe('selectors', () => {
  it('ghép kỳ hiện tại với kỳ trước cùng vị trí', () => {
    const rows = toChartRows(
      [
        { period: '2026-02', metrics: { registrations: 5 } },
        { period: '2026-03', metrics: { registrations: 7 } },
      ],
      [{ period: '2025-12', metrics: { registrations: 3 } }],
    );
    expect(rows[0]).toMatchObject({
      period: '2026-02',
      previousPeriod: '2025-12',
      previous: { registrations: 3 },
    });
    expect(rows[1]).toMatchObject({ previous: null, previousPeriod: null });
  });

  it('định dạng kỳ', () => {
    expect(formatPeriod('2026-03')).toBe('T3/26');
    expect(formatPeriod('2026-Q2')).toBe('Q2/26');
    expect(formatPeriod('2026')).toBe('2026');
  });
});

describe('labels', () => {
  it('định dạng giá trị chỉ số theo đơn vị', () => {
    expect(formatKpiValue(1234, 'COUNT')).toBe('1.234');
    expect(formatKpiValue(87.46, 'PERCENT')).toBe('87,5%');
    expect(formatKpiValue(7.25, 'SCORE')).toBe('7,3');
    expect(formatKpiValue(null, 'COUNT')).toBe('—');
  });

  it('chênh lệch so với kỳ trước: tỷ lệ ghi "điểm", số đếm ghi %, màu theo tăng tốt/xấu', () => {
    expect(formatDelta({ unit: 'PERCENT', delta: -3.2, deltaPct: null })).toBe('−3,2 điểm');
    expect(formatDelta({ unit: 'COUNT', delta: 5, deltaPct: 12.5 })).toBe('+12,5%');
    expect(formatDelta({ unit: 'COUNT', delta: null, deltaPct: null })).toBeNull();
    expect(deltaTone(5, true)).toBe('good');
    expect(deltaTone(5, false)).toBe('bad');
    expect(deltaTone(-5, false)).toBe('good');
    expect(deltaTone(0, true)).toBe('neutral');
    expect(deltaTone(5, undefined)).toBe('neutral');
  });

  it('chú thích chỉ số ảnh chụp và nhãn khóa', () => {
    expect(
      snapshotFootnote({ key: 'activeLeaders', unit: 'COUNT', numerator: null, denominator: null }),
    ).toBe('Hiện tại');
    expect(
      snapshotFootnote({ key: 'activeRate', unit: 'PERCENT', numerator: 80, denominator: 100 }),
    ).toBe('80 / 100');
    expect(
      snapshotFootnote({ key: 'registrations', unit: 'COUNT', numerator: null, denominator: null }),
    ).toBeNull();
    expect(keyLabel('NAM')).toBe('Nam');
    expect(keyLabel('X', 'Giáo xứ A')).toBe('Giáo xứ A');
  });

  it('hạn đăng ký còn lại', () => {
    expect(deadlineText(null)).toBe('Không giới hạn hạn đăng ký');
    expect(deadlineText(0)).toBe('Còn dưới 1 giờ');
    expect(deadlineText(5)).toBe('Còn 5 giờ');
    expect(deadlineText(75)).toBe('Còn 3 ngày');
  });
});

describe('formatRecordValue', () => {
  it('ngày, Có/Không, kết quả, trạng thái được dịch', () => {
    expect(formatRecordValue('birthDate', '1995-04-12')).toBe('12/04/1995');
    expect(formatRecordValue('active', true)).toBe('Có');
    expect(formatRecordValue('result', 'COMPLETED')).toBe('Đạt');
    expect(formatRecordValue('approvalStatus', 'PENDING')).toBe('Chờ duyệt');
    expect(formatRecordValue('score', 8.5)).toBe('8,5');
    expect(formatRecordValue('hostYear', 2026)).toBe('2026');
    expect(formatRecordValue('x', null)).toBe('');
  });
});

describe('khoảng thời gian tùy chọn (date picker)', () => {
  const today = new Date(2026, 10, 14);

  it('nhãn tùy chọn hiển thị ngày dd/MM/yyyy', () => {
    expect(
      presetLabel({
        ...DEFAULT_FILTERS,
        preset: 'custom',
        fromDate: '2026-01-05',
        toDate: '2026-03-20',
      }),
    ).toBe('05/01/2026 → 20/03/2026');
  });

  it('effectiveRange: preset tính ra, custom theo ngày chọn, 12 tháng qua theo khoảng BE đã dùng', () => {
    expect(effectiveRange({ ...DEFAULT_FILTERS, preset: 'thisMonth' }, undefined, today)).toEqual({
      fromDate: '2026-11-01',
      toDate: '2026-11-30',
    });
    expect(
      effectiveRange({ ...DEFAULT_FILTERS, preset: 'custom', fromDate: '2026-02-01', toDate: '' }),
    ).toEqual({ fromDate: '2026-02-01', toDate: '' });
    expect(
      effectiveRange(DEFAULT_FILTERS, { fromDate: '2025-12-01', toDate: '2026-11-30' }),
    ).toEqual({ fromDate: '2025-12-01', toDate: '2026-11-30' });
  });

  it('chọn ngày tùy chọn thì gửi BE đúng khoảng ngày đó', () => {
    const query = buildAnalyticsQuery(
      withResolvedRange({
        ...DEFAULT_FILTERS,
        preset: 'custom',
        fromDate: '2026-01-05',
        toDate: '2026-03-20',
      }),
    );
    expect(query.fromDate).toBe('2026-01-05');
    expect(query.toDate).toBe('2026-03-20');
  });
});
