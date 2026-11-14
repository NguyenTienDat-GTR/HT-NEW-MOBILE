import { quickSearchPath } from './QuickSearchScreen';

describe('quickSearchPath', () => {
  it('đổi từng loại kết quả sang màn chi tiết của app', () => {
    expect(quickSearchPath('leader', 'a b')).toBe('/res/leaders/a%20b');
    expect(quickSearchPath('diocese', '1')).toBe('/res/dioceses/1');
    expect(quickSearchPath('course', 'K1')).toBe('/res/courses/K1');
    expect(quickSearchPath('certificate', 'C9')).toBe('/res/certificates/C9');
  });
});
