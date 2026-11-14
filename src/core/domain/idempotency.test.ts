import { newIdempotencyKey } from './idempotency';

describe('newIdempotencyKey', () => {
  it('đúng khuôn BE: 8-100 ký tự gồm chữ, số, ., _, :, -', () => {
    const key = newIdempotencyKey();
    expect(key).toMatch(/^[A-Za-z0-9._:-]{8,100}$/);
  });
  it('mỗi lần sinh một khóa khác nhau', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
});
