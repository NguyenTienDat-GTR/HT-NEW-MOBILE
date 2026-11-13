export type NamingMode = 'SEQUENTIAL' | 'CUSTOM';
export type AssignmentMode = 'RANDOM' | 'UNIT_LIMIT';

/** Nội dung form chia đội (mọi ô là chuỗi vì lấy từ ô nhập). */
export interface DivideDraft {
  teamCount: string;
  teamSize: string;
  namingMode: NamingMode;
  /** Mỗi dòng một tên đội (khi đặt tên tùy chỉnh). */
  teamNames: string;
  assignmentMode: AssignmentMode;
  maxUnitsPerTeam: string;
}

const intOf = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN);
const namesOf = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

/** Số đội gợi ý để đủ chỗ cho mọi hồ sơ: ceil(tổng / số hồ sơ mỗi đội). */
export function suggestedTeamCount(total: number, teamSize: number): number {
  return teamSize > 0 && total > 0 ? Math.ceil(total / teamSize) : 0;
}

/** Lỗi tiếng Việt theo từng ô (khóa = tên ô); rỗng nếu hợp lệ. Giới hạn theo BE (TeamDivideRequest). */
export function validateDivide(draft: DivideDraft, total: number): Record<string, string> {
  const errors: Record<string, string> = {};
  const count = intOf(draft.teamCount);
  const size = intOf(draft.teamSize);
  if (!(count >= 1 && count <= 500)) errors.teamCount = 'Số đội phải từ 1 đến 500';
  if (!(size >= 1)) errors.teamSize = 'Số hồ sơ mỗi đội phải từ 1 trở lên';
  if (!errors.teamCount && !errors.teamSize && count * size < total)
    errors.teamSize = `Chưa đủ chỗ: ${count} đội × ${size} hồ sơ chỉ chứa ${count * size}/${total} người`;
  if (draft.namingMode === 'CUSTOM') {
    const names = namesOf(draft.teamNames);
    if (!errors.teamCount && names.length !== count)
      errors.teamNames = `Cần đúng ${count} tên đội, đang có ${names.length}`;
    else if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
      errors.teamNames = 'Tên đội không được trùng nhau';
  }
  if (draft.assignmentMode === 'UNIT_LIMIT' && !(intOf(draft.maxUnitsPerTeam) >= 1))
    errors.maxUnitsPerTeam = 'Số đơn vị tối đa mỗi đội phải từ 1 trở lên';
  return errors;
}

export function buildDivideBody(draft: DivideDraft) {
  return {
    teamCount: intOf(draft.teamCount),
    teamSize: intOf(draft.teamSize),
    namingMode: draft.namingMode,
    teamNames: draft.namingMode === 'CUSTOM' ? namesOf(draft.teamNames) : undefined,
    assignmentMode: draft.assignmentMode,
    maxUnitsPerTeam:
      draft.assignmentMode === 'UNIT_LIMIT' ? intOf(draft.maxUnitsPerTeam) : undefined,
  };
}
