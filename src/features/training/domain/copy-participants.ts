/**
 * Sao chép danh sách tham dự từ khóa tiên quyết vào khóa đang tạo/sửa (như web: course-copy-sources-field và
 * copy-leaders-dialog). Giá trị của ô lưu dạng chuỗi JSON `CopyState`.
 */
export type CopyMode = 'ALL' | 'PASSED_ONLY';

export interface CopyState {
  /** Mã các khóa nguồn đã chọn. */
  codes: string[];
  mode: CopyMode;
  /** Chọn riêng từng huynh trưởng; undefined = chưa chọn riêng, sao chép theo `mode`. */
  leaderIds?: string[];
}

/** Khóa nguồn chọn được (khớp CourseCopyModels.AnySource của BE). */
export interface CopySource {
  courseCode: string;
  courseName: string;
  hostYear: number | null;
  courseTypeName?: string | null;
  pastCourse?: boolean;
  ownerName?: string | null;
  participantCount: number;
  passedCount: number;
}

/** Huynh trưởng có thể sao chép từ danh sách tham dự của khóa nguồn. */
export interface CopyCandidate {
  leaderId: string;
  holyName?: string | null;
  fullName?: string | null;
  parishName?: string | null;
  deaneryName?: string | null;
  sourceCourseName?: string | null;
  finalResult?: string | null;
  blockedReason?: string | null;
}

export type ResultFilter = '' | 'PASSED' | 'FAILED';

/** Mặc định chỉ hiện các khóa tổ chức trong vòng 2 năm tính từ năm tổ chức của khóa đích. */
export const SOURCE_YEAR_WINDOW = 2;

export const EMPTY_COPY: CopyState = { codes: [], mode: 'ALL' };

export function parseCopyState(value: string | boolean | undefined): CopyState {
  if (typeof value !== 'string' || value.trim() === '') return EMPTY_COPY;
  try {
    const raw = JSON.parse(value) as Partial<CopyState> | null;
    return {
      codes: Array.isArray(raw?.codes) ? raw.codes.map(String) : [],
      mode: raw?.mode === 'PASSED_ONLY' ? 'PASSED_ONLY' : 'ALL',
      leaderIds: Array.isArray(raw?.leaderIds) ? raw.leaderIds.map(String) : undefined,
    };
  } catch {
    return EMPTY_COPY;
  }
}

export const stringifyCopyState = (state: CopyState): string => JSON.stringify(state);

export function inYearWindow(source: CopySource, targetYear: number | null): boolean {
  if (targetYear === null || source.hostYear === null || source.hostYear === undefined) return true;
  return source.hostYear >= targetYear - SOURCE_YEAR_WINDOW && source.hostYear <= targetYear;
}

/** Khóa khớp từ khóa tìm (tên, năm, loại khóa, người tạo; mọi từ đều phải có). */
export function matchesSource(source: CopySource, keyword: string): boolean {
  const haystack = [
    source.courseName,
    source.hostYear,
    source.courseTypeName,
    source.pastCourse ? 'khóa quá khứ' : '',
    source.ownerName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return keyword
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .every((part) => haystack.includes(part));
}

/** Số hồ sơ tối đa sao chép được từ các khóa nguồn đã chọn (chưa trừ hồ sơ trùng giữa các khóa hoặc đã có trong khóa). */
export function estimateCopyCount(
  sources: readonly CopySource[],
  selected: readonly string[],
  mode: CopyMode,
): number {
  return sources
    .filter((source) => selected.includes(source.courseCode))
    .reduce(
      (total, source) =>
        total + (mode === 'PASSED_ONLY' ? source.passedCount : source.participantCount),
      0,
    );
}

/** Hồ sơ chọn sẵn khi mở danh sách chọn riêng: mọi hồ sơ sao chép được (cách "chỉ đạt" thì chỉ hồ sơ đạt). */
export function defaultLeaderSelection(
  candidates: readonly CopyCandidate[],
  passedOnly: boolean,
): string[] {
  return candidates
    .filter((item) => !item.blockedReason && (!passedOnly || item.finalResult === 'PASSED'))
    .map((item) => item.leaderId);
}

export function matchesCandidate(
  item: CopyCandidate,
  keyword: string,
  result: ResultFilter,
): boolean {
  if (result && item.finalResult !== result) return false;
  const text = keyword.trim().toLowerCase();
  if (!text) return true;
  const haystack = [
    item.holyName,
    item.fullName,
    item.parishName,
    item.deaneryName,
    item.sourceCourseName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return text.split(/\s+/).every((part) => haystack.includes(part));
}

/** Phần thân gửi BE: chỉ gửi khi có chọn khóa nguồn (copyLeaderIds chỉ khi đã chọn riêng từng người). */
export function buildCopyBody(state: CopyState): Record<string, unknown> {
  if (state.codes.length === 0) return {};
  return {
    copySourceCourseCodes: state.codes,
    copyMode: state.mode,
    ...(state.leaderIds && state.leaderIds.length > 0 ? { copyLeaderIds: state.leaderIds } : {}),
  };
}
