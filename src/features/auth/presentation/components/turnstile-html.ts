/**
 * Trang HTML nhúng widget Cloudflare Turnstile cho WebView.
 * Nhận siteKey công khai từ BE; gửi token về app qua ReactNativeWebView.postMessage.
 */
export type TurnstileMessage =
  { type: 'token'; token: string } | { type: 'expired' } | { type: 'error' };

export function buildTurnstileHtml(siteKey: string): string {
  // JSON.stringify + thay "<" để chuỗi không thoát khỏi thẻ <script>.
  const safeKey = JSON.stringify(siteKey).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>html,body{margin:0;padding:0;background:transparent}body{display:flex;justify-content:center;align-items:center;min-height:70px}</style>
<script>
function post(message){window.ReactNativeWebView.postMessage(JSON.stringify(message));}
function onTurnstileLoad(){
  turnstile.render('#widget',{
    sitekey:${safeKey},
    language:'vi',
    callback:function(token){post({type:'token',token:token});},
    'expired-callback':function(){post({type:'expired'});},
    'error-callback':function(){post({type:'error'});}
  });
}
</script>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad" async defer></script>
</head>
<body><div id="widget"></div></body>
</html>`;
}

export function parseTurnstileMessage(raw: string): TurnstileMessage | null {
  try {
    const value = JSON.parse(raw) as { type?: string; token?: string };
    if (value.type === 'token' && typeof value.token === 'string' && value.token) {
      return { type: 'token', token: value.token };
    }
    if (value.type === 'expired') return { type: 'expired' };
    if (value.type === 'error') return { type: 'error' };
    return null;
  } catch {
    return null;
  }
}
