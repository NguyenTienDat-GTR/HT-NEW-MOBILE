/**
 * Thang cấp độ: mỗi cấp có `displayOrder`, số càng lớn cấp càng cao; các cấp cùng số là "bằng cấp" (một bậc).
 * Cấp hệ thống (NONE) luôn ở đáy và không đổi vị trí. Đổi thứ tự gửi BE danh sách các bậc từ thấp lên cao.
 */
export interface LevelLike {
  levelCode: string;
  displayOrder: number;
  isSystem: boolean;
}

/** Các bậc từ thấp lên cao, bỏ cấp hệ thống; cấp cùng `displayOrder` nằm chung một bậc. */
export function toTiers(levels: readonly LevelLike[]): string[][] {
  const sorted = levels
    .filter((level) => !level.isSystem)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const tiers: string[][] = [];
  let last: number | null = null;
  for (const level of sorted) {
    if (last !== null && level.displayOrder === last)
      tiers[tiers.length - 1]!.push(level.levelCode);
    else tiers.push([level.levelCode]);
    last = level.displayOrder;
  }
  return tiers;
}

/** Bậc thấp nhất bằng cấp khởi đầu (displayOrder trùng cấp hệ thống) — BE cần biết để đánh số lại đúng. */
export function firstTierIsBase(levels: readonly LevelLike[]): boolean {
  const system = levels.find((level) => level.isSystem);
  const lowest = levels
    .filter((level) => !level.isSystem)
    .sort((a, b) => a.displayOrder - b.displayOrder)[0];
  return Boolean(system && lowest && lowest.displayOrder === system.displayOrder);
}

/**
 * Đẩy một cấp lên (cấp cao hơn) hoặc xuống. Cấp đang cùng bậc với cấp khác thì tách riêng thành bậc mới ngay
 * phía trên/dưới bậc cũ; cấp đứng một mình thì đổi chỗ với bậc kế bên. Không đi được nữa thì trả nguyên.
 */
export function moveLevel(
  tiers: readonly string[][],
  code: string,
  direction: 'up' | 'down',
): string[][] {
  const copy = tiers.map((tier) => [...tier]);
  const index = copy.findIndex((tier) => tier.includes(code));
  if (index < 0) return copy;
  const tier = copy[index]!;
  if (tier.length > 1) {
    tier.splice(tier.indexOf(code), 1);
    copy.splice(direction === 'up' ? index + 1 : index, 0, [code]);
    return copy;
  }
  const target = direction === 'up' ? index + 1 : index - 1;
  if (target < 0 || target >= copy.length) return copy;
  [copy[index], copy[target]] = [copy[target]!, copy[index]!];
  return copy;
}

export function canMove(
  tiers: readonly string[][],
  code: string,
  direction: 'up' | 'down',
): boolean {
  const index = tiers.findIndex((tier) => tier.includes(code));
  if (index < 0) return false;
  if ((tiers[index]?.length ?? 0) > 1) return true;
  return direction === 'up' ? index < tiers.length - 1 : index > 0;
}

export const LEVEL_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,49}$/;
