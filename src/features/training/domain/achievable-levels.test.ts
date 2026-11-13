import { achievableLevels } from './achievable-levels';

const levels = [
  { levelCode: 'NONE', levelName: 'Chưa có cấp', displayOrder: 0 },
  { levelCode: 'HT_XU', levelName: 'Huynh trưởng xứ', displayOrder: 1 },
  { levelCode: 'HT_I', levelName: 'Huynh trưởng cấp I', displayOrder: 2 },
  { levelCode: 'HT_II', levelName: 'Huynh trưởng cấp II', displayOrder: 3 },
];

describe('cấp độ đạt được của hồ sơ ngoại lệ', () => {
  it('chỉ cấp cao hơn cấp hiện tại và không vượt cấp của khóa', () => {
    expect(achievableLevels(levels, 'HT_XU', 'HT_II').map((l) => l.levelCode)).toEqual([
      'HT_I',
      'HT_II',
    ]);
    expect(achievableLevels(levels, 'NONE', 'HT_I').map((l) => l.levelCode)).toEqual([
      'HT_XU',
      'HT_I',
    ]);
  });

  it('khóa không thăng cấp hoặc đã ở cấp cao nhất thì không có lựa chọn', () => {
    expect(achievableLevels(levels, 'HT_XU', undefined)).toEqual([]);
    expect(achievableLevels(levels, 'HT_II', 'HT_II')).toEqual([]);
  });
});
