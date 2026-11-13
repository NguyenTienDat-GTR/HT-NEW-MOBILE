import type { ResourceRow } from '@/core/resource/resource-gateway';

/** Đọc an toàn các trường của một dòng BE (kiểu `unknown`). */
export function text(row: ResourceRow, key: string): string {
  const value = row[key];
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
}

export function flag(row: ResourceRow, key: string): boolean {
  return row[key] === true;
}

export function count(row: ResourceRow, key: string): number {
  const value = row[key];
  return typeof value === 'number' ? value : 0;
}

/** Ghép các phần không rỗng, ngăn cách bằng " · " (dòng phụ của thẻ). */
export function joinParts(
  parts: readonly (string | null | undefined | false)[],
  glue = ' · ',
): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(glue);
}

/** Ngày "MM-dd" của BE -> "dd/MM" hiển thị. */
export function formatDayMonth(value?: string | null): string {
  const match = value ? /^(\d{2})-(\d{2})$/.exec(value) : null;
  return match ? `${match[2]}/${match[1]}` : '';
}
