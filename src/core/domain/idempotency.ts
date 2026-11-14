/**
 * Khóa idempotency cho tác vụ chạy nền (BE bắt buộc header `Idempotency-Key`, 8-100 ký tự gồm chữ, số, `.`, `_`, `:`,
 * `-`): sinh một lần cho mỗi ý định của người dùng, gửi lại cùng khóa khi thử lại thì BE trả đúng tác vụ cũ.
 */
export function newIdempotencyKey(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';
