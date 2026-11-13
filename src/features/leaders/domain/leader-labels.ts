/** Tên mặc định của các cấp (mỗi giáo phận có danh mục riêng; tên thật tra từ /leader-levels/options). */
const DEFAULT_LEVEL_NAMES: Record<string, string> = {
  NONE: 'Chưa có cấp',
  HT_XU: 'Huynh trưởng xứ',
  DU_TRUONG: 'Dự trưởng',
  HT_I: 'Huynh trưởng cấp I',
  HT_II: 'Huynh trưởng cấp II',
  HT_III: 'Huynh trưởng cấp III',
  HLV_I: 'Huấn luyện viên cấp I',
  HLV_II: 'Huấn luyện viên cấp II',
  HLV_III: 'Huấn luyện viên cấp III',
};

export function levelLabel(code: string | null | undefined, names?: ReadonlyMap<string, string>) {
  if (!code) return '';
  return names?.get(code) ?? DEFAULT_LEVEL_NAMES[code] ?? code;
}

export const GENDER_OPTIONS = [
  { value: 'NAM', label: 'Nam' },
  { value: 'NU', label: 'Nữ' },
] as const;

export function genderLabel(code: string | null | undefined): string {
  return GENDER_OPTIONS.find((option) => option.value === code)?.label ?? '';
}

/** Nhãn giáo xứ/họ/điểm trong ô chọn: giáo họ, giáo điểm kèm giáo xứ cha ("Giáo họ Bà Lụa - Giáo xứ Phú Cường"). */
export function parishOptionLabel(row: {
  name?: unknown;
  unitTypeLabel?: unknown;
  parentParishName?: unknown;
}): string {
  const name = String(row.name ?? '');
  const typeLabel = String(row.unitTypeLabel ?? '');
  const parent = String(row.parentParishName ?? '');
  if (!parent && (!typeLabel || typeLabel === 'Giáo xứ')) return name;
  const head = typeLabel && !name.startsWith(typeLabel) ? `${typeLabel} ${name}` : name;
  return parent ? `${head} - ${parent}` : head;
}

export function rankSentence(
  newLevel: string,
  promotionDate: string,
  names?: ReadonlyMap<string, string>,
) {
  const year = /^(\d{4})/.exec(promotionDate)?.[1];
  return `${levelLabel(newLevel, names)}${year ? ` năm ${year}` : ''}`;
}
