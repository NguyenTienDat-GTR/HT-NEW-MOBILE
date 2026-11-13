/**
 * Thành phần điểm của khóa: điểm tổng kết = Σ(điểm × hệ số) / Σ hệ số của các thành phần "tính vào tổng kết".
 * Giá trị trong form lưu dạng chuỗi JSON để dùng được trong FormValues (chuỗi/boolean).
 */
export interface ScoreComponentDraft {
  id?: string;
  name: string;
  maxScore: string;
  coefficient: string;
  includeInFinal: boolean;
  /** Đã có điểm nhập: chỉ đổi được tên và thứ tự. */
  hasScores?: boolean;
}

export const DEFAULT_SCORE_COMPONENT: ScoreComponentDraft = {
  name: '',
  maxScore: '10',
  coefficient: '1',
  includeInFinal: true,
};

export function parseScoreComponents(raw: string): ScoreComponentDraft[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScoreComponentDraft[]) : [];
  } catch {
    return [];
  }
}

export const stringifyScoreComponents = (rows: readonly ScoreComponentDraft[]) =>
  JSON.stringify(rows);

/** Từ phản hồi BE của khóa sang bản nháp trong form. */
export function draftsFromCourse(components: unknown): ScoreComponentDraft[] {
  if (!Array.isArray(components)) return [];
  return components.map((item: Record<string, unknown>) => ({
    id: item.id === undefined || item.id === null ? undefined : String(item.id),
    name: String(item.name ?? ''),
    maxScore: String(item.maxScore ?? ''),
    coefficient: String(item.coefficient ?? ''),
    includeInFinal: item.includeInFinal !== false,
    hasScores: item.hasScores === true,
  }));
}

const num = (value: string) => Number(value.replace(',', '.'));

/** Điểm tổng kết tối đa (trung bình có hệ số của điểm tối đa); null nếu chưa có thành phần nào được tính. */
export function maxFinalScore(rows: readonly ScoreComponentDraft[]): number | null {
  let weighted = 0;
  let coefficients = 0;
  for (const row of rows) {
    const max = num(row.maxScore);
    const coefficient = num(row.coefficient);
    if (row.includeInFinal && max > 0 && coefficient > 0) {
      weighted += max * coefficient;
      coefficients += coefficient;
    }
  }
  return coefficients > 0 ? Math.round((weighted / coefficients) * 100) / 100 : null;
}

/** Lỗi tiếng Việt hoặc null. */
export function scoreComponentsError(rows: readonly ScoreComponentDraft[]): string | null {
  if (rows.length === 0) return 'Cần ít nhất một thành phần điểm';
  for (const [index, row] of rows.entries()) {
    const label = `Thành phần ${index + 1}`;
    if (row.name.trim() === '') return `${label}: vui lòng nhập tên`;
    if (!(num(row.maxScore) >= 0.01)) return `${label}: điểm tối đa phải lớn hơn 0`;
    if (!(num(row.coefficient) >= 0.01)) return `${label}: hệ số phải lớn hơn 0`;
  }
  if (!rows.some((row) => row.includeInFinal))
    return 'Cần ít nhất một thành phần được tính vào điểm tổng kết';
  return null;
}

/** Thân gửi BE: có id = sửa thành phần đã có, không có id = thêm mới; thứ tự là thứ tự hiển thị. */
export function scoreComponentsBody(rows: readonly ScoreComponentDraft[]) {
  return rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    name: row.name.trim(),
    maxScore: num(row.maxScore),
    coefficient: num(row.coefficient),
    includeInFinal: row.includeInFinal,
  }));
}
