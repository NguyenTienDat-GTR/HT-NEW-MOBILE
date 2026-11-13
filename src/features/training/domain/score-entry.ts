/** Một thành phần điểm của khóa (từ GET /training/courses/{mã}/score-components). */
export interface ScoreComponent {
  id: string;
  name: string;
  maxScore: number;
  coefficient: number;
  includeInFinal: boolean;
  displayOrder?: number;
}

const toNumber = (value: string) => Number(value.trim().replace(',', '.'));

/** Lỗi tiếng Việt của từng ô điểm (khóa = id thành phần); rỗng nếu hợp lệ. Phải nhập đủ mọi thành phần. */
export function validateScores(
  components: readonly ScoreComponent[],
  values: Readonly<Record<string, string>>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const component of components) {
    const raw = (values[component.id] ?? '').trim();
    if (raw === '') {
      errors[component.id] = 'Vui lòng nhập điểm';
      continue;
    }
    const score = toNumber(raw);
    if (!Number.isFinite(score) || score < 0) errors[component.id] = 'Điểm phải là số không âm';
    else if (score > component.maxScore)
      errors[component.id] = `Điểm không được vượt quá ${component.maxScore}`;
  }
  return errors;
}

/** Điểm tổng kết tạm tính = Σ(điểm × hệ số) / Σ hệ số của thành phần tính vào tổng kết; null nếu chưa đủ dữ liệu. */
export function previewTotal(
  components: readonly ScoreComponent[],
  values: Readonly<Record<string, string>>,
): number | null {
  let weighted = 0;
  let coefficients = 0;
  for (const component of components) {
    if (!component.includeInFinal) continue;
    const raw = (values[component.id] ?? '').trim();
    if (raw === '') return null;
    const score = toNumber(raw);
    if (!Number.isFinite(score)) return null;
    weighted += score * component.coefficient;
    coefficients += component.coefficient;
  }
  return coefficients > 0 ? Math.round((weighted / coefficients) * 100) / 100 : null;
}

/** Thân gửi BE (TrainingScoreRequest). */
export function buildScoreBody(
  components: readonly ScoreComponent[],
  values: Readonly<Record<string, string>>,
  review: string,
  scoreNote: string,
) {
  return {
    componentScores: components.map((component) => ({
      componentId: component.id,
      score: toNumber(values[component.id] ?? ''),
    })),
    review: review.trim() || undefined,
    scoreNote: scoreNote.trim() || undefined,
  };
}
