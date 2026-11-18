import { levelBarRatio, parseLeaderLevelStats } from './leader-level-stats';

describe('thống kê huynh trưởng theo cấp độ', () => {
  it('đọc phản hồi BE, giữ thứ tự và bỏ dòng hỏng', () => {
    const stats = parseLeaderLevelStats({
      total: 7,
      levels: [
        { levelCode: 'NONE', levelName: 'Chưa có cấp', displayOrder: 0, leaderCount: 2 },
        { levelName: 'Thiếu mã', leaderCount: 9 },
        null,
        { levelCode: 'HT_I', levelName: 'Huynh trưởng cấp I', displayOrder: 3, leaderCount: 5 },
        { levelCode: 'HT_II', levelName: 'Huynh trưởng cấp II', leaderCount: 'x' },
      ],
    });
    expect(stats.total).toBe(7);
    expect(stats.levels.map((level) => [level.levelCode, level.leaderCount])).toEqual([
      ['NONE', 2],
      ['HT_I', 5],
      ['HT_II', 0],
    ]);
  });

  it('phản hồi rỗng hoặc sai kiểu thì ra danh sách rỗng', () => {
    expect(parseLeaderLevelStats(undefined)).toEqual({ total: 0, levels: [] });
    expect(parseLeaderLevelStats({ levels: 'x' })).toEqual({ total: 0, levels: [] });
  });

  it('thanh theo tỉ lệ với cấp đông nhất, cấp có người luôn thấy được', () => {
    expect(levelBarRatio(0, 10)).toBe(0);
    expect(levelBarRatio(10, 10)).toBe(1);
    expect(levelBarRatio(5, 10)).toBe(0.5);
    expect(levelBarRatio(1, 1000)).toBe(0.04);
    expect(levelBarRatio(3, 0)).toBe(0);
  });
});
