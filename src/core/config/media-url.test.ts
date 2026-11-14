import { resolveMediaUrl } from './media-url';

describe('resolveMediaUrl', () => {
  const base = 'https://example.test/backend/api';
  it('ghép đường dẫn media vào gốc API', () => {
    expect(resolveMediaUrl(base, '/api/media/1/thumb?exp=1&sig=a')).toBe(
      'https://example.test/backend/api/media/1/thumb?exp=1&sig=a',
    );
  });
  it('giữ nguyên URL tuyệt đối, data URL; rỗng thì null', () => {
    expect(resolveMediaUrl(base, 'https://cdn.test/a.jpg')).toBe('https://cdn.test/a.jpg');
    expect(resolveMediaUrl(base, 'data:image/png;base64,AA')).toBe('data:image/png;base64,AA');
    expect(resolveMediaUrl(base, null)).toBeNull();
  });
});
