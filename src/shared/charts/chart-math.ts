/**
 * Tính toán thuần cho biểu đồ. Mọi kích thước đều suy ra từ BỀ RỘNG THỰC của khung (đo bằng onLayout),
 * không dùng số px cố định của web, để biểu đồ không tràn hay thiếu số liệu trên màn 320–430dp.
 */

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Cận trên "đẹp" cho trục: 1, 2, 2.5, 5, 10 × 10^n. Luôn ≥ max và ≥ 1. */
export function niceMax(max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const exponent = Math.floor(Math.log10(max));
  const base = 10 ** exponent;
  const fraction = max / base;
  const step = [1, 2, 2.5, 5, 10].find((candidate) => fraction <= candidate + 1e-9) ?? 10;
  return step * base;
}

/** Các mốc đều nhau từ 0 tới `top` (gồm cả 0 và top). */
export function ticks(top: number, count: number): number[] {
  const n = Math.max(1, Math.floor(count));
  return Array.from({ length: n + 1 }, (_, index) => (top * index) / n);
}

/**
 * Chọn các chỉ số nhãn trục X để hai nhãn liền kề cách nhau ≥ `minGap` px. Luôn giữ nhãn đầu và cuối nếu đủ chỗ.
 * `slotWidth` là khoảng cách giữa hai điểm liền kề.
 */
export function thinIndices(count: number, slotWidth: number, minGap: number): number[] {
  if (count <= 0) return [];
  const every = Math.max(1, Math.ceil(minGap / Math.max(slotWidth, 1)));
  const result: number[] = [];
  for (let index = 0; index < count; index += every) result.push(index);
  const last = count - 1;
  const lastKept = result[result.length - 1] ?? 0;
  if (lastKept !== last) {
    // Đổi nhãn cuối bằng điểm cuối nếu hai nhãn cuối sát nhau, ngược lại thêm vào.
    if ((last - lastKept) * slotWidth < minGap) result[result.length - 1] = last;
    else result.push(last);
  }
  return result;
}

/** Chiều cao biểu đồ xu hướng: ≈ 56% bề rộng, kẹp trong [200, 260] (vùng vẽ), nhỏ hơn cho dạng diện tích. */
export function trendHeight(
  width: number,
  variant: 'line' | 'area' | 'stackedBar' = 'line',
): number {
  const ratio = variant === 'area' ? 0.5 : 0.56;
  return clamp(Math.round(width * ratio), 200, 260);
}

/** Đường kính donut: tối đa 132, không quá 40% bề rộng khung, tối thiểu 96. */
export function donutDiameter(width: number): number {
  return clamp(Math.floor(width * 0.4), 96, 132);
}

/** Đường kính đồng hồ tỷ lệ khi xếp `perRow` cái một hàng. */
export function gaugeDiameter(width: number, perRow = 3, gap = 8): number {
  return clamp(Math.floor((width - gap * (perRow - 1)) / perRow), 72, 108);
}

export interface HeatmapLayout {
  /** Số cột hiển thị cùng lúc. */
  visibleColumns: number;
  cellWidth: number;
  /** true nếu không đủ chỗ cho mọi cột: cần phân trang theo kỳ thay vì cuộn ngang. */
  paged: boolean;
}

/**
 * Bản đồ nhiệt: ô tối thiểu 22px. Nếu tất cả cột không đủ chỗ thì chia trang theo kỳ (nút ‹ ›),
 * không cuộn ngang. `fixedWidth` là bề rộng cột tên + cột tổng.
 */
export function heatmapLayout(
  width: number,
  columnCount: number,
  fixedWidth: number,
  minCell = 22,
): HeatmapLayout {
  const available = Math.max(0, width - fixedWidth);
  if (columnCount <= 0) return { visibleColumns: 0, cellWidth: minCell, paged: false };
  const fits = Math.floor(available / minCell);
  if (fits >= columnCount) {
    return {
      visibleColumns: columnCount,
      cellWidth: Math.min(40, available / columnCount),
      paged: false,
    };
  }
  const visible = Math.max(1, fits);
  return { visibleColumns: visible, cellWidth: available / visible, paged: true };
}

/** Pha màu `hex` với trắng theo `ratio` (0 = trắng, 1 = nguyên màu). Dùng cho ô nhiệt và nền biểu tượng. */
export function mixWithWhite(hex: string, ratio: number): string {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;
  const r = clamp(ratio, 0, 1);
  const channel = (offset: number) => {
    const value = parseInt(clean.slice(offset, offset + 2), 16);
    return Math.round(255 + (value - 255) * r)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Đường cong monotone (Fritsch–Carlson) qua các điểm, trả về chuỗi `d` của SVG path.
 * Không "vọt" quá giá trị dữ liệu như spline thường. Điểm null được bỏ qua bởi người gọi (tách đoạn).
 */
export function monotonePath(points: readonly Point[]): string {
  const n = points.length;
  if (n === 0) return '';
  const first = points[0] as Point;
  if (n === 1) return `M${first.x},${first.y}`;
  if (n === 2) {
    const second = points[1] as Point;
    return `M${first.x},${first.y}L${second.x},${second.y}`;
  }
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    dx.push(b.x - a.x);
    slope.push(dx[i] === 0 ? 0 : (b.y - a.y) / (b.x - a.x));
  }
  const tangent: number[] = new Array<number>(n).fill(0);
  tangent[0] = slope[0] as number;
  tangent[n - 1] = slope[n - 2] as number;
  for (let i = 1; i < n - 1; i += 1) {
    const s0 = slope[i - 1] as number;
    const s1 = slope[i] as number;
    tangent[i] = s0 * s1 <= 0 ? 0 : (s0 + s1) / 2;
  }
  for (let i = 0; i < n - 1; i += 1) {
    const s = slope[i] as number;
    if (s === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = (tangent[i] as number) / s;
    const b = (tangent[i + 1] as number) / s;
    const h = Math.hypot(a, b);
    if (h > 3) {
      const t = 3 / h;
      tangent[i] = t * a * s;
      tangent[i + 1] = t * b * s;
    }
  }
  let d = `M${first.x},${first.y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = points[i] as Point;
    const p1 = points[i + 1] as Point;
    const h = dx[i] as number;
    const c1x = p0.x + h / 3;
    const c1y = p0.y + ((tangent[i] as number) * h) / 3;
    const c2x = p1.x - h / 3;
    const c2y = p1.y - ((tangent[i + 1] as number) * h) / 3;
    d += `C${c1x},${c1y},${c2x},${c2y},${p1.x},${p1.y}`;
  }
  return d;
}

/**
 * Tách dãy giá trị có null thành các đoạn liên tục (đường bị đứt ở kỳ không có dữ liệu thay vì rơi về 0).
 */
export function splitSegments<T>(values: readonly (T | null)[]): { start: number; items: T[] }[] {
  const segments: { start: number; items: T[] }[] = [];
  let current: { start: number; items: T[] } | null = null;
  values.forEach((value, index) => {
    if (value === null) {
      current = null;
      return;
    }
    if (!current) {
      current = { start: index, items: [] };
      segments.push(current);
    }
    current.items.push(value);
  });
  return segments;
}

/** Gộp các phần tử nhỏ nhất thành "Khác" khi vượt `max` phần (donut tối đa 6 lát). */
export function mergeSmallest<T extends { value: number }>(
  items: readonly T[],
  max: number,
  makeOther: (value: number) => T,
): T[] {
  if (items.length <= max) return [...items];
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, max - 1);
  const rest = sorted.slice(max - 1).reduce((sum, item) => sum + item.value, 0);
  return [...head, makeOther(rest)];
}
