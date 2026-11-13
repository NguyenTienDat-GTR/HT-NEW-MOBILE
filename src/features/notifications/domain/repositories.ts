import type { Page } from '@/core/domain/page';

import type { NotificationItem, PushDevice } from './entities';

export interface NotificationRepository {
  list(page: number, size: number): Promise<Page<NotificationItem>>;
  unreadCount(): Promise<number>;
  markRead(id: string): Promise<void>;
}

/** Luồng thông báo mới theo thời gian thực (STOMP). Trả hàm hủy đăng ký. */
export interface NotificationStream {
  subscribe(handler: (item: NotificationItem) => void): () => void;
}

/** Đăng ký/hủy thiết bị nhận push ở BE. */
export interface PushDeviceRepository {
  register(device: PushDevice): Promise<void>;
  unregister(deviceId: string): Promise<void>;
}
