import { safeFileName } from './share-file';

jest.mock('expo-file-system', () => ({ File: class {}, Paths: { cache: {} } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

describe('tên tệp chia sẻ', () => {
  it('bỏ dấu tiếng Việt và ký tự lạ, luôn có đuôi .pdf', () => {
    expect(safeFileName('GPPC-HTI-2026-1')).toBe('GPPC-HTI-2026-1.pdf');
    expect(safeFileName('Chứng nhận Đặng Văn/An.pdf')).toBe('Chung-nhan-Dang-Van-An.pdf');
  });

  it('tên rỗng hoặc toàn ký tự lạ thì dùng tên mặc định', () => {
    expect(safeFileName('///')).toBe('tai-lieu.pdf');
    expect(safeFileName('')).toBe('tai-lieu.pdf');
  });
});
