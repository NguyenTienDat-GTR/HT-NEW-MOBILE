import { organizingState, type CourseStatusFields } from './course-state';

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

/**
 * Như web: cho lưu riêng từng cột điểm, chỉ kiểm tra những ô đã nhập (ô trống để nhập sau). Trả lỗi theo id thành phần.
 */
export function validateFilledScores(
  components: readonly ScoreComponent[],
  values: Readonly<Record<string, string>>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const component of components) {
    const raw = (values[component.id] ?? '').trim();
    if (raw === '') continue;
    const score = toNumber(raw);
    if (!Number.isFinite(score) || score < 0) errors[component.id] = 'Điểm phải là số không âm';
    else if (score > component.maxScore)
      errors[component.id] = `Điểm không được vượt quá ${component.maxScore}`;
  }
  return errors;
}

/** Có ít nhất một ô điểm đã nhập. */
export const hasAnyScore = (
  components: readonly ScoreComponent[],
  values: Readonly<Record<string, string>>,
): boolean => components.some((component) => (values[component.id] ?? '').trim() !== '');

/**
 * Lý do không nhập điểm được (như web), hoặc null nếu nhập được: khóa chưa/không còn diễn ra, đã khóa chỉnh sửa điểm,
 * khóa bị vô hiệu hóa, chứng nhận của hồ sơ đã duyệt (BE cũng chặn).
 */
export function scoringBlockedReason(
  course: CourseStatusFields & { scoreLocked?: unknown; status?: unknown },
  participant: { certificateApprovalStatus?: unknown },
): string | null {
  if (course.status === false) return 'Khóa huấn luyện đã bị vô hiệu hóa nên không chấm điểm được.';
  if (course.scoreLocked === true)
    return 'Điểm của khóa đang bị khóa chỉnh sửa. Cần mở khóa mới nhập được điểm.';
  if (participant.certificateApprovalStatus === 'APPROVED')
    return 'Chứng nhận của hồ sơ này đã được duyệt nên điểm bị khóa.';
  if (organizingState(course) !== 'ONGOING') {
    const start = typeof course.startDate === 'string' ? course.startDate : '';
    const end = typeof course.endDate === 'string' ? course.endDate : '';
    return `Chỉ chấm điểm được khi khóa đang diễn ra${start || end ? ` (${start || '…'} → ${end || '…'})` : ''}.`;
  }
  return null;
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
    // Chỉ gửi các cột đã có điểm (như web), cột trống để nhập sau.
    componentScores: components
      .filter((component) => (values[component.id] ?? '').trim() !== '')
      .map((component) => ({
        componentId: component.id,
        score: toNumber(values[component.id] ?? ''),
      })),
    review: review.trim() || undefined,
    scoreNote: scoreNote.trim() || undefined,
  };
}
