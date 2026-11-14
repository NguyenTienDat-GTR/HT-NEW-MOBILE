/** Bộ lọc áp sẵn từ đường dẫn: `?filters={"khóa":"giá trị"}`; chuỗi hỏng hoặc giá trị không phải chuỗi thì bỏ qua. */
export function parseInitialFilters(raw: string | undefined): Record<string, string> | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return undefined;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return undefined;
  }
}

export type InitialStatus = 'all' | 'active' | 'inactive';

/** Trạng thái hoạt động áp sẵn từ đường dẫn: `?status=inactive`; giá trị khác thì không áp. */
export function parseInitialStatus(raw: string | undefined): InitialStatus | undefined {
  return raw === 'active' || raw === 'inactive' || raw === 'all' ? raw : undefined;
}

/** Giá trị bộ lọc áp sẵn nếu nằm trong danh sách cho phép, không thì giá trị mặc định. */
export function pickAllowed<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.find((item) => item === value) ?? fallback;
}
