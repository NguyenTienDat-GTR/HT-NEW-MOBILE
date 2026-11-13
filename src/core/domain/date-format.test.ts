import { formatDate, relativeTime } from './date-format';

describe('formatDate', () => {
  it('ngày thuần không bị lệch múi giờ', () => {
    expect(formatDate('2026-11-13')).toBe('13/11/2026');
    expect(formatDate('2026-01-05')).toBe('05/01/2026');
  });

  it('rỗng hoặc không hợp lệ thì trả chuỗi rỗng', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('abc')).toBe('');
  });
});

describe('relativeTime', () => {
  const now = new Date('2026-11-13T10:00:00Z').getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('hiện thời gian tương đối bằng tiếng Việt', () => {
    expect(relativeTime(ago(20_000), now)).toBe('Vừa xong');
    expect(relativeTime(ago(5 * 60_000), now)).toBe('5 phút trước');
    expect(relativeTime(ago(3 * 3_600_000), now)).toBe('3 giờ trước');
    expect(relativeTime(ago(2 * 86_400_000), now)).toBe('2 ngày trước');
  });

  it('quá 7 ngày thì hiện ngày; rỗng thì trả rỗng', () => {
    expect(relativeTime(ago(10 * 86_400_000), now)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(relativeTime(null, now)).toBe('');
  });
});
