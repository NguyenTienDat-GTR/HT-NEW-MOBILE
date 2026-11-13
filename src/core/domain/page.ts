/** Trang kết quả của BE (Spring Page) rút gọn theo những gì app dùng. */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  /** Chỉ số trang hiện tại, bắt đầu từ 0. */
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export function emptyPage<T>(size = 20): Page<T> {
  return { content: [], totalElements: 0, totalPages: 0, number: 0, size, first: true, last: true };
}
