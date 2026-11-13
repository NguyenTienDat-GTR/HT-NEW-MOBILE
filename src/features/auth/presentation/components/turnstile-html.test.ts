import { buildTurnstileHtml, parseTurnstileMessage } from './turnstile-html';

describe('buildTurnstileHtml', () => {
  it('nhúng siteKey dạng chuỗi JSON an toàn, không thoát khỏi thẻ script', () => {
    const html = buildTurnstileHtml('abc"</script><script>alert(1)//');
    expect(html).not.toContain('</script><script>alert(1)');
    expect(html).toContain('sitekey:"abc\\"\\u003c/script>');
    expect(html).toContain('challenges.cloudflare.com/turnstile/v0/api.js');
  });
});

describe('parseTurnstileMessage', () => {
  it('đọc token, hết hạn, lỗi; bỏ qua dữ liệu lạ', () => {
    expect(parseTurnstileMessage('{"type":"token","token":"t"}')).toEqual({
      type: 'token',
      token: 't',
    });
    expect(parseTurnstileMessage('{"type":"expired"}')).toEqual({ type: 'expired' });
    expect(parseTurnstileMessage('{"type":"error"}')).toEqual({ type: 'error' });
    expect(parseTurnstileMessage('{"type":"token","token":""}')).toBeNull();
    expect(parseTurnstileMessage('không phải json')).toBeNull();
  });
});
