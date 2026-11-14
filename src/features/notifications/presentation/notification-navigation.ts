import type { NotificationItem } from '../domain/entities';
import { NOTIFICATIONS_PATH, appPathOf, notificationPath } from '../domain/notification-rules';

/**
 * Đường dẫn mở được trên app cho một thông báo: màn tương ứng của web (đã đổi sang đường dẫn của app); thông báo không
 * có màn riêng (đích là hộp thư) thì null, chỉ hiện chi tiết. BE vẫn kiểm tra quyền khi vào màn, như web.
 */
export function openablePath(
  item: Pick<NotificationItem, 'eventType' | 'courseCode' | 'senderUnitType' | 'senderUnitId'>,
): string | null {
  const path = notificationPath(item);
  return path === NOTIFICATIONS_PATH ? null : appPathOf(path);
}
