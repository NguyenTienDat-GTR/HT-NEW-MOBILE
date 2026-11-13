import {
  canMove,
  firstTierIsBase,
  LEVEL_CODE_PATTERN,
  moveLevel,
  toTiers,
} from './leader-level-order';

const level = (levelCode: string, displayOrder: number, isSystem = false) => ({
  levelCode,
  displayOrder,
  isSystem,
});

const levels = [
  level('NONE', 0, true),
  level('HT_XU', 1),
  level('DU_TRUONG', 2),
  level('HT_I', 3),
  level('HT_I_B', 3),
  level('HT_II', 4),
];

describe('thang cấp độ', () => {
  it('gom cấp cùng displayOrder thành một bậc, từ thấp lên cao, bỏ cấp hệ thống', () => {
    expect(toTiers(levels)).toEqual([['HT_XU'], ['DU_TRUONG'], ['HT_I', 'HT_I_B'], ['HT_II']]);
  });

  it('nhận biết bậc thấp nhất bằng cấp khởi đầu', () => {
    expect(firstTierIsBase(levels)).toBe(false);
    expect(firstTierIsBase([level('NONE', 0, true), level('A', 0), level('B', 1)])).toBe(true);
  });

  it('cấp đứng một mình đổi chỗ với bậc kế bên', () => {
    const tiers = toTiers(levels);
    expect(moveLevel(tiers, 'DU_TRUONG', 'up')).toEqual([
      ['HT_XU'],
      ['HT_I', 'HT_I_B'],
      ['DU_TRUONG'],
      ['HT_II'],
    ]);
    expect(moveLevel(tiers, 'DU_TRUONG', 'down')).toEqual([
      ['DU_TRUONG'],
      ['HT_XU'],
      ['HT_I', 'HT_I_B'],
      ['HT_II'],
    ]);
  });

  it('cấp đang cùng bậc được tách riêng lên trên hoặc xuống dưới bậc cũ', () => {
    const tiers = toTiers(levels);
    expect(moveLevel(tiers, 'HT_I_B', 'up')).toEqual([
      ['HT_XU'],
      ['DU_TRUONG'],
      ['HT_I'],
      ['HT_I_B'],
      ['HT_II'],
    ]);
    expect(moveLevel(tiers, 'HT_I_B', 'down')).toEqual([
      ['HT_XU'],
      ['DU_TRUONG'],
      ['HT_I_B'],
      ['HT_I'],
      ['HT_II'],
    ]);
  });

  it('không đi quá đầu/cuối thang và không sửa mảng gốc', () => {
    const tiers = toTiers(levels);
    expect(canMove(tiers, 'HT_II', 'up')).toBe(false);
    expect(canMove(tiers, 'HT_XU', 'down')).toBe(false);
    expect(canMove(tiers, 'HT_I', 'up')).toBe(true);
    expect(moveLevel(tiers, 'HT_II', 'up')).toEqual(tiers);
    expect(tiers).toEqual([['HT_XU'], ['DU_TRUONG'], ['HT_I', 'HT_I_B'], ['HT_II']]);
  });

  it('mã cấp: chữ hoa, số, gạch dưới, bắt đầu bằng chữ, 2-50 ký tự', () => {
    expect(LEVEL_CODE_PATTERN.test('HT_IV')).toBe(true);
    expect(LEVEL_CODE_PATTERN.test('ht_iv')).toBe(false);
    expect(LEVEL_CODE_PATTERN.test('1HT')).toBe(false);
    expect(LEVEL_CODE_PATTERN.test('A')).toBe(false);
  });
});
