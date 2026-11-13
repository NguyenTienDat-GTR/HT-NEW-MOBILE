/**
 * Các màn hình ĐÃ có trên mobile mà số liệu phân tích có thể dẫn tới (href do BE trả, cùng đường dẫn với web).
 * Mỗi đợt làm thêm màn hình thì thêm tiền tố vào đây; href chưa có màn thì ô không bấm được (thay vì lỗi).
 */
const AVAILABLE_PATH_PREFIXES: readonly string[] = [];

/** Đường dẫn mở được trên mobile cho một href của BE, hoặc null nếu màn đích chưa có. */
export function openableHref(href: string): string | null {
  if (!href) return null;
  const path = href.split('?')[0] ?? href;
  return AVAILABLE_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
    ? href
    : null;
}
