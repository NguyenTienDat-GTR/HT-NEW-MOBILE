/**
 * Chờ một tác vụ chạy nền xong (xuất thẻ PDF, xuất chứng nhận PDF, xuất Excel): hỏi trạng thái định kỳ cho tới khi
 * tác vụ kết thúc (như pollUntilDone của web). Hết số lần hỏi mà chưa xong thì báo lỗi tiếng Việt.
 */
export interface PollOptions {
  /** Khoảng chờ giữa hai lần hỏi (ms). */
  intervalMs?: number;
  /** Số lần hỏi tối đa. */
  maxAttempts?: number;
  /** Cho phép thay hàm chờ khi kiểm thử. */
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_INTERVAL_MS = 1500;
const DEFAULT_MAX_ATTEMPTS = 200;

export async function pollJob<T>(
  initial: T,
  fetchStatus: (current: T) => Promise<T>,
  isFinished: (job: T) => boolean,
  options: PollOptions = {},
): Promise<T> {
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const interval = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const attempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  let current = initial;
  for (let attempt = 0; attempt < attempts && !isFinished(current); attempt += 1) {
    await sleep(interval);
    current = await fetchStatus(current);
  }
  if (!isFinished(current)) throw new Error('Quá thời gian chờ xử lý, vui lòng thử lại sau.');
  return current;
}
