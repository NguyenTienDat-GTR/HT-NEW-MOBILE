import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { DownloadedBytes } from '@/core/network/http-client';

/** Tên tệp an toàn để ghi vào bộ nhớ đệm: bỏ dấu tiếng Việt và ký tự lạ, giữ đuôi .pdf. */
export function safeFileName(name: string, extension = 'pdf'): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\.[A-Za-z0-9]{1,5}$/, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);
  return `${base || 'tai-lieu'}.${extension}`;
}

/**
 * Lưu tệp vào máy: người dùng chọn thư mục (Tải xuống, Tài liệu…) rồi ghi tệp vào đó. Trả 'cancelled' nếu người dùng
 * không chọn thư mục.
 */
export async function saveDownloadedFile(
  downloaded: DownloadedBytes,
  filename: string,
): Promise<'saved' | 'cancelled'> {
  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch (exception) {
    if (
      /cancel|dismiss|abort/i.test(
        exception instanceof Error ? exception.message : String(exception),
      )
    )
      return 'cancelled';
    throw exception;
  }
  const mimeType = downloaded.contentType.split(';')[0]?.trim() || 'application/octet-stream';
  const file = directory.createFile(filename, mimeType);
  await file.write(downloaded.bytes);
  return 'saved';
}

/**
 * Ghi nội dung tải về vào bộ nhớ đệm rồi mở hộp chia sẻ của hệ điều hành (lưu, gửi Zalo/mail, in…).
 * Trả về false nếu thiết bị không có hộp chia sẻ (vd. bản web xem thử).
 */
export async function shareDownloadedFile(
  downloaded: DownloadedBytes,
  filename: string,
  dialogTitle: string,
): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  await file.write(downloaded.bytes);
  const mimeType = downloaded.contentType.split(';')[0]?.trim() || 'application/pdf';
  await Sharing.shareAsync(file.uri, {
    mimeType,
    UTI: mimeType.includes('spreadsheetml')
      ? 'org.openxmlformats.spreadsheetml.sheet'
      : mimeType.includes('zip')
        ? 'public.zip-archive'
        : 'com.adobe.pdf',
    dialogTitle,
  });
  return true;
}
