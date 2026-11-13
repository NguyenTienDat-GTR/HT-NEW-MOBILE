/**
 * Định dạng số kiểu Việt Nam (dấu chấm ngăn nghìn, dấu phẩy thập phân), viết tay để không phụ thuộc Intl
 * (Hermes trên Android có thể thiếu dữ liệu locale vi-VN).
 */

function group(integerPart: string): string {
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Làm tròn tới `maxFraction` chữ số thập phân rồi định dạng; bỏ số 0 thừa ở cuối phần thập phân. */
export function formatNumber(value: number, maxFraction = 0): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = Math.abs(value).toFixed(maxFraction);
  const [intPart = '0', fraction = ''] = fixed.split('.');
  const trimmed = fraction.replace(/0+$/, '');
  const sign = value < 0 && Number(fixed) !== 0 ? '−' : '';
  return `${sign}${group(intPart)}${trimmed ? `,${trimmed}` : ''}`;
}

export const fmtNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : formatNumber(value, 0);

export const fmtDecimal = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : formatNumber(value, 1);

export const fmtPercent = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : `${formatNumber(value, 1)}%`;

/** Rút gọn số lớn cho nhãn trục: 950 -> "950", 1200 -> "1,2K", 2500000 -> "2,5M". */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${formatNumber(value / 1_000_000, 1)}M`;
  if (abs >= 1_000) return `${formatNumber(value / 1_000, 1)}K`;
  return formatNumber(value, 0);
}
