import { useEffect, useState } from 'react';

/** Giá trị trễ `delayMs` sau lần đổi cuối (dùng cho ô tìm kiếm để không gọi API mỗi phím bấm). */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
