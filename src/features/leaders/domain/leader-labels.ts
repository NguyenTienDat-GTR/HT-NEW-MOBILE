import { levelLabel } from '@/core/domain/level-labels';

export { levelLabel };

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
