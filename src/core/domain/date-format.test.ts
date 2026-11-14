import {
  formatDate,
  formatLocalDateTime,
  maskVnDateInput,
  parseVnDate,
  parseVnDateTime,
  relativeTime,
} from './date-format';

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

describe('nhập ngày dd/MM/yyyy', () => {
  it('parseVnDate nhận ngày có thật và từ chối ngày không có thật', () => {
    expect(parseVnDate('13/11/2026')).toBe('2026-11-13');
    expect(parseVnDate('1/2/2026')).toBe('2026-02-01');
    expect(parseVnDate('29/02/2028')).toBe('2028-02-29');
    expect(parseVnDate('29/02/2027')).toBeNull();
    expect(parseVnDate('31/04/2026')).toBeNull();
    expect(parseVnDate('2026-11-13')).toBeNull();
    expect(parseVnDate('13/11')).toBeNull();
  });

  it('parseVnDateTime ghép giờ 24h và từ chối giờ sai', () => {
    expect(parseVnDateTime('13/11/2026 09:05')).toBe('2026-11-13T09:05');
    expect(parseVnDateTime('13/11/2026 23:59')).toBe('2026-11-13T23:59');
    expect(parseVnDateTime('13/11/2026 24:00')).toBeNull();
    expect(parseVnDateTime('13/11/2026 09:60')).toBeNull();
    expect(parseVnDateTime('13/11/2026')).toBeNull();
  });

  it('formatLocalDateTime hiển thị dd/MM/yyyy HH:mm', () => {
    expect(formatLocalDateTime('2026-11-13T09:05')).toBe('13/11/2026 09:05');
    expect(formatLocalDateTime('')).toBe('');
  });

  it('maskVnDateInput tự thêm dấu khi gõ chữ số', () => {
    expect(maskVnDateInput('13112026', false)).toBe('13/11/2026');
    expect(maskVnDateInput('1311', false)).toBe('13/11');
    expect(maskVnDateInput('131120260905', true)).toBe('13/11/2026 09:05');
    expect(maskVnDateInput('13/11/2026 09', true)).toBe('13/11/2026 09');
  });
});
