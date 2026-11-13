/** Một cấp độ trong danh mục của giáo phận; `displayOrder` càng lớn cấp càng cao. */
export interface LevelInfo {
  levelCode: string;
  levelName: string;
  displayOrder: number;
}

const rankOf = (levels: readonly LevelInfo[], code: string | null | undefined) =>
  levels.find((level) => level.levelCode === code)?.displayOrder ?? 0;

/**
 * Hồ sơ ngoại lệ khi duyệt: người duyệt chọn cấp độ đạt được. Chỉ chọn được cấp cao hơn cấp hiện tại của huynh trưởng
 * và không cao hơn cấp độ khi hoàn thành của khóa (giống web).
 */
export function achievableLevels(
  levels: readonly LevelInfo[],
  currentLevel: string | null | undefined,
  courseLevel: string | null | undefined,
): LevelInfo[] {
  const current = rankOf(levels, currentLevel);
  const max = rankOf(levels, courseLevel);
  return levels
    .filter((level) => level.displayOrder > current && level.displayOrder <= max)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}
