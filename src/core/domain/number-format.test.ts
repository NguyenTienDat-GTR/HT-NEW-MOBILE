import { fmtDecimal, fmtNumber, fmtPercent, formatCompact, formatNumber } from './number-format';

describe('number format (vi-VN)', () => {
  it('ngăn nghìn bằng dấu chấm, thập phân bằng dấu phẩy, bỏ số 0 thừa', () => {
    expect(formatNumber(1234567)).toBe('1.234.567');
    expect(formatNumber(1234.5, 1)).toBe('1.234,5');
    expect(formatNumber(12, 1)).toBe('12');
    expect(formatNumber(0.04, 1)).toBe('0');
    expect(formatNumber(-3.25, 1)).toBe('−3,3');
  });

  it('null/undefined hiện gạch ngang', () => {
    expect(fmtNumber(null)).toBe('—');
    expect(fmtDecimal(undefined)).toBe('—');
    expect(fmtPercent(null)).toBe('—');
    expect(fmtPercent(87.46)).toBe('87,5%');
  });

  it('rút gọn số lớn cho nhãn trục', () => {
    expect(formatCompact(950)).toBe('950');
    expect(formatCompact(1200)).toBe('1,2K');
    expect(formatCompact(2_500_000)).toBe('2,5M');
  });
});
