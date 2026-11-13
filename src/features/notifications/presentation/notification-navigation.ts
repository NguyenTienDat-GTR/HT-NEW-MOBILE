import type { NotificationItem } from '../domain/entities';
import { notificationPath } from '../domain/notification-rules';

/**
 * Các màn hình ĐÃ có trên mobile. Thông báo trỏ tới màn chưa có thì chỉ hiện chi tiết, không có nút mở.
 * Mỗi đợt làm thêm màn hình thì thêm tiền tố vào đây (mở rộng, không sửa logic).
 */
const AVAILABLE_PATH_PREFIXES: readonly string[] = ['/my-permissions'];

/** Đường dẫn mở được cho thông báo, hoặc null nếu màn đích chưa có trên mobile. */
export function openablePath(
  item: Pick<NotificationItem, 'eventType' | 'courseCode' | 'senderUnitType' | 'senderUnitId'>,
): string | null {
  const path = notificationPath(item);
  return AVAILABLE_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
    ? path
    : null;
}
