/**
 * URL ảnh BE trả về có dạng `/api/media/{id}/{biến thể}?exp=..&sig=..` (đã ký, có hạn nên không cần Bearer). Web ghép
 * tiền tố `/backend`; app ghép vào gốc API (`https://<host>/backend/api`). URL tuyệt đối hoặc ảnh base64 cũ giữ nguyên.
 */
export function resolveMediaUrl(apiBaseUrl: string, url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith('/api/media/')) return url;
  return `${apiBaseUrl.replace(/\/api$/, '')}${url}`;
}
