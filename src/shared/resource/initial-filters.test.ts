import { parseInitialFilters, parseInitialStatus, pickAllowed } from './initial-filters';

describe('bộ lọc áp sẵn từ đường dẫn', () => {
  it('đọc JSON, bỏ giá trị không phải chuỗi và chuỗi hỏng', () => {
    expect(parseInitialFilters('{"approvalStatus":"PENDING","n":3}')).toEqual({
      approvalStatus: 'PENDING',
    });
    expect(parseInitialFilters('khong-phai-json')).toBeUndefined();
    expect(parseInitialFilters(undefined)).toBeUndefined();
    expect(parseInitialFilters('5')).toBeUndefined();
  });

  it('trạng thái chỉ nhận active / inactive / all', () => {
    expect(parseInitialStatus('inactive')).toBe('inactive');
    expect(parseInitialStatus('xyz')).toBeUndefined();
  });

  it('pickAllowed chỉ nhận giá trị nằm trong danh sách', () => {
    expect(pickAllowed('REJECTED', ['PENDING', 'REJECTED'] as const, 'PENDING')).toBe('REJECTED');
    expect(pickAllowed('LA', ['PENDING', 'REJECTED'] as const, 'PENDING')).toBe('PENDING');
    expect(pickAllowed(undefined, ['PENDING', 'REJECTED'] as const, 'PENDING')).toBe('PENDING');
  });
});
