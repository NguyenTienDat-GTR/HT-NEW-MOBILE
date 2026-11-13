import {
  donutDiameter,
  gaugeDiameter,
  heatmapLayout,
  mergeSmallest,
  mixWithWhite,
  monotonePath,
  niceMax,
  splitSegments,
  thinIndices,
  ticks,
  trendHeight,
} from './chart-math';

describe('niceMax / ticks', () => {
  it('cận trên đẹp và luôn ≥ giá trị lớn nhất', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(11)).toBe(20);
    expect(niceMax(23)).toBe(25);
    expect(niceMax(1234)).toBe(2000);
    for (const value of [0.3, 1, 3, 48, 99, 101, 4321, 98765]) {
      expect(niceMax(value)).toBeGreaterThanOrEqual(value);
    }
  });

  it('ticks chia đều gồm cả 0 và đỉnh', () => {
    expect(ticks(20, 4)).toEqual([0, 5, 10, 15, 20]);
  });
});

describe('thinIndices (nhãn trục X không đè nhau)', () => {
  const gapOk = (idx: number[], slot: number, gap: number) =>
    idx.every((value, i) => i === 0 || (value - (idx[i - 1] as number)) * slot >= gap - 1e-9);

  it.each([320, 360, 430])(
    '12 kỳ ở bề rộng %i: nhãn cách nhau ≥ 40px và giữ nhãn cuối',
    (width) => {
      const slot = (width - 44) / 11;
      const idx = thinIndices(12, slot, 40);
      expect(idx[0]).toBe(0);
      expect(idx[idx.length - 1]).toBe(11);
      expect(gapOk(idx, slot, 40)).toBe(true);
    },
  );

  it('ít kỳ thì hiện hết', () => {
    expect(thinIndices(4, 80, 40)).toEqual([0, 1, 2, 3]);
    expect(thinIndices(0, 80, 40)).toEqual([]);
  });
});

describe('kích thước theo bề rộng màn hình', () => {
  it('trendHeight kẹp trong [200, 260]', () => {
    expect(trendHeight(300)).toBe(200);
    expect(trendHeight(360)).toBe(202);
    expect(trendHeight(430)).toBe(241);
    expect(trendHeight(900)).toBe(260);
    expect(trendHeight(430, 'area')).toBe(215);
  });

  it('donut không quá 132 và không quá 40% bề rộng', () => {
    expect(donutDiameter(320)).toBe(128);
    expect(donutDiameter(430)).toBe(132);
    expect(donutDiameter(200)).toBe(96);
  });

  it('3 đồng hồ vừa một hàng ở 320–430', () => {
    for (const width of [320, 360, 430]) {
      expect(gaugeDiameter(width) * 3 + 16).toBeLessThanOrEqual(width);
    }
  });
});

describe('heatmapLayout', () => {
  it('đủ chỗ thì hiện hết cột, không phân trang', () => {
    const layout = heatmapLayout(430, 12, 120);
    expect(layout.paged).toBe(false);
    expect(layout.visibleColumns).toBe(12);
  });

  it('hẹp thì chia trang theo kỳ, ô ≥ 22px, không tràn bề rộng', () => {
    const layout = heatmapLayout(320, 12, 140);
    expect(layout.paged).toBe(true);
    expect(layout.cellWidth).toBeGreaterThanOrEqual(22);
    expect(layout.visibleColumns * layout.cellWidth + 140).toBeLessThanOrEqual(320 + 1e-6);
  });
});

describe('mixWithWhite', () => {
  it('0 = trắng, 1 = nguyên màu, màu lạ giữ nguyên', () => {
    expect(mixWithWhite('#2a78d6', 0)).toBe('#ffffff');
    expect(mixWithWhite('#2a78d6', 1)).toBe('#2a78d6');
    expect(mixWithWhite('không phải màu', 0.5)).toBe('không phải màu');
  });
});

describe('monotonePath / splitSegments / mergeSmallest', () => {
  it('đường cong bắt đầu đúng điểm đầu và đi qua điểm cuối', () => {
    const d = monotonePath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 5 },
    ]);
    expect(d.startsWith('M0,10C')).toBe(true);
    expect(d.endsWith(',20,5')).toBe(true);
    expect(monotonePath([{ x: 1, y: 2 }])).toBe('M1,2');
    expect(monotonePath([])).toBe('');
  });

  it('null làm đứt đường thành các đoạn', () => {
    expect(splitSegments([1, 2, null, 3, null, null, 4, 5])).toEqual([
      { start: 0, items: [1, 2] },
      { start: 3, items: [3] },
      { start: 6, items: [4, 5] },
    ]);
  });

  it('gộp phần nhỏ nhất thành "Khác" khi quá 6 lát', () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ key: `k${i}`, value: i + 1 }));
    const merged = mergeSmallest(items, 6, (value) => ({ key: 'other', value }));
    expect(merged).toHaveLength(6);
    expect(merged.at(-1)).toEqual({ key: 'other', value: 1 + 2 + 3 + 4 });
    expect(merged.reduce((sum, item) => sum + item.value, 0)).toBe(45);
  });
});
