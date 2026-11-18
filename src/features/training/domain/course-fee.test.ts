import {
  amountFromDigits,
  digitsOnly,
  feeAmountError,
  feeBody,
  formatVnd,
  formatVndNumber,
  MAX_FEE_AMOUNT,
  vndToWords,
} from './course-fee';

describe('định dạng tiền VND', () => {
  it('nhóm hàng nghìn bằng dấu chấm, không dùng Intl', () => {
    expect(formatVndNumber(150000)).toBe('150.000');
    expect(formatVndNumber(1250000)).toBe('1.250.000');
    expect(formatVndNumber(999)).toBe('999');
    expect(formatVnd(150000)).toBe('150.000 ₫');
    expect(formatVnd(0)).toBe('0 ₫');
  });

  it('chỉ giữ chữ số, bỏ số 0 đứng đầu và cắt quá độ dài', () => {
    expect(digitsOnly('150.000 ₫')).toBe('150000');
    expect(digitsOnly('abc')).toBe('');
    expect(digitsOnly('000150')).toBe('150');
    expect(digitsOnly('0')).toBe('0');
    expect(digitsOnly('123456789012345')).toBe('1234567890');
  });

  it('ô trống không bị coi là 0', () => {
    expect(amountFromDigits('')).toBeNull();
    expect(amountFromDigits('abc')).toBeNull();
    expect(amountFromDigits('0')).toBe(0);
    expect(amountFromDigits('150000')).toBe(150000);
  });
});

describe('đọc số tiền bằng chữ', () => {
  it.each([
    [0, 'Không đồng'],
    [1, 'Một đồng'],
    [5, 'Năm đồng'],
    [10, 'Mười đồng'],
    [15, 'Mười lăm đồng'],
    [21, 'Hai mươi mốt đồng'],
    [24, 'Hai mươi tư đồng'],
    [25, 'Hai mươi lăm đồng'],
    [105, 'Một trăm lẻ năm đồng'],
    [110, 'Một trăm mười đồng'],
    [1000, 'Một nghìn đồng'],
    [1005, 'Một nghìn không trăm lẻ năm đồng'],
    [15000, 'Mười lăm nghìn đồng'],
    [50000, 'Năm mươi nghìn đồng'],
    [150000, 'Một trăm năm mươi nghìn đồng'],
    [200000, 'Hai trăm nghìn đồng'],
    [1000000, 'Một triệu đồng'],
    [1250000, 'Một triệu hai trăm năm mươi nghìn đồng'],
    [2005000, 'Hai triệu không trăm lẻ năm nghìn đồng'],
    [10500000, 'Mười triệu năm trăm nghìn đồng'],
    [
      999999999,
      'Chín trăm chín mươi chín triệu chín trăm chín mươi chín nghìn chín trăm chín mươi chín đồng',
    ],
    [1000000000, 'Một tỷ đồng'],
    [1001000000, 'Một tỷ không trăm lẻ một triệu đồng'],
  ])('%i -> %s', (amount, words) => {
    expect(vndToWords(amount)).toBe(words);
  });

  it('không đọc số âm, số lẻ hay quá lớn', () => {
    expect(vndToWords(-1)).toBe('');
    expect(vndToWords(1.5)).toBe('');
    expect(vndToWords(1_000_000_000_000)).toBe('');
  });
});

describe('kiểm tra lệ phí của form khóa', () => {
  const on = { feeEnabled: true };

  it('lệ phí phải là số nguyên đồng lớn hơn 0 và không vượt 999.999.999', () => {
    expect(feeAmountError('150000', on)).toBeNull();
    expect(feeAmountError('1', on)).toBeNull();
    expect(feeAmountError(String(MAX_FEE_AMOUNT), on)).toBeNull();
    expect(feeAmountError('0', on)).toBe('Lệ phí mỗi người phải lớn hơn 0 đồng');
    expect(feeAmountError('abc', on)).toBe('Lệ phí mỗi người phải lớn hơn 0 đồng');
    expect(feeAmountError('1000000000', on)).toBe(
      'Lệ phí mỗi người không được vượt quá 999.999.999 đồng',
    );
  });

  it('để trống thì để quy tắc bắt buộc xử lý; tắt thu lệ phí thì không kiểm tra', () => {
    expect(feeAmountError('', on)).toBeNull();
    expect(feeAmountError('  ', on)).toBeNull();
    expect(feeAmountError('0', { feeEnabled: false })).toBeNull();
    expect(feeAmountError('0', {})).toBeNull();
  });
});

describe('thân gửi BE cho phần lệ phí', () => {
  it('bật thì gửi cờ và số tiền', () => {
    expect(feeBody({ feeEnabled: true, feeAmount: '150000' })).toEqual({
      feeEnabled: true,
      feeAmount: 150000,
    });
  });

  it('tắt thì chỉ gửi cờ tắt, không gửi số tiền', () => {
    expect(feeBody({ feeEnabled: false, feeAmount: '150000' })).toEqual({ feeEnabled: false });
    expect(feeBody({})).toEqual({ feeEnabled: false });
  });

  it('bật nhưng chưa có số tiền thì chỉ gửi cờ (BE báo lỗi rõ ràng)', () => {
    expect(feeBody({ feeEnabled: true, feeAmount: '' })).toEqual({ feeEnabled: true });
  });
});
