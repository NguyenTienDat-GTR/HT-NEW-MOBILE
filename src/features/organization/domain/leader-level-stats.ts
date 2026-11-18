/** Số huynh trưởng theo từng cấp độ của một giáo phận / giáo hạt / giáo xứ (GET /<đơn vị>/<mã>/leader-level-stats). */
export interface LeaderLevelStatItem {
  levelCode: string;
  levelName: string;
  leaderCount: number;
}

export interface LeaderLevelStats {
  total: number;
  levels: LeaderLevelStatItem[];
}

const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

/** Đọc phản hồi BE, bỏ qua dòng hỏng; BE đã sắp từ cấp thấp lên cao. */
export function parseLeaderLevelStats(raw: unknown): LeaderLevelStats {
  const data = (raw ?? {}) as { total?: unknown; levels?: unknown };
  const levels = (Array.isArray(data.levels) ? data.levels : []).flatMap((item): LeaderLevelStatItem[] => {
    const entry = (item ?? {}) as Record<string, unknown>;
    if (typeof entry.levelCode !== 'string' || typeof entry.levelName !== 'string') return [];
    return [
      { levelCode: entry.levelCode, levelName: entry.levelName, leaderCount: asNumber(entry.leaderCount) },
    ];
  });
  return { total: asNumber(data.total), levels };
}

/** Tỉ lệ (0..1) của thanh so với cấp đông nhất; cấp có người luôn có thanh nhìn thấy được. */
export function levelBarRatio(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  return Math.max(0.04, count / max);
}
