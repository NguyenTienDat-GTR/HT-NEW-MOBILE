import type { Page } from '@/core/domain/page';
import type { PushGateway } from '@/core/push/push-gateway';
import type { DeviceIdProvider } from '@/core/storage/device-id';

import type { NotificationItem } from './entities';
import type {
  NotificationRepository,
  NotificationStream,
  PushDeviceRepository,
} from './repositories';

export class ListNotifications {
  constructor(private readonly repository: NotificationRepository) {}

  execute(page: number, size: number): Promise<Page<NotificationItem>> {
    return this.repository.list(page, size);
  }
}

export class GetUnreadNotificationCount {
  constructor(private readonly repository: NotificationRepository) {}

  execute(): Promise<number> {
    return this.repository.unreadCount();
  }
}

export class MarkNotificationRead {
  constructor(private readonly repository: NotificationRepository) {}

  execute(id: string): Promise<void> {
    return this.repository.markRead(id);
  }
}

/** BE chưa có "đọc tất cả": đánh dấu lần lượt theo lô nhỏ (4) để không vượt giới hạn tần suất, như web. */
export class MarkAllNotificationsRead {
  private static readonly BATCH_SIZE = 4;

  constructor(private readonly repository: NotificationRepository) {}

  async execute(ids: readonly string[]): Promise<void> {
    const size = MarkAllNotificationsRead.BATCH_SIZE;
    for (let index = 0; index < ids.length; index += size) {
      await Promise.all(ids.slice(index, index + size).map((id) => this.repository.markRead(id)));
    }
  }
}

export class ObserveNotifications {
  constructor(private readonly stream: NotificationStream) {}

  execute(handler: (item: NotificationItem) => void): () => void {
    return this.stream.subscribe(handler);
  }
}

/**
 * Xin quyền, lấy push token rồi đăng ký thiết bị ở BE. Không bao giờ ném lỗi: push là tiện ích bổ sung,
 * lỗi (từ chối quyền, BE chưa hỗ trợ, mất mạng) chỉ nghĩa là thử lại ở lần mở app sau.
 */
export class RegisterPushDevice {
  constructor(
    private readonly gateway: PushGateway,
    private readonly devices: PushDeviceRepository,
    private readonly deviceId: DeviceIdProvider,
    private readonly appVersion: string,
  ) {}

  async execute(): Promise<boolean> {
    try {
      const registration = await this.gateway.register();
      if (!registration) return false;
      await this.devices.register({
        deviceId: await this.deviceId.get(),
        pushToken: registration.token,
        platform: registration.platform,
        appVersion: this.appVersion,
      });
      return true;
    } catch {
      return false;
    }
  }
}

/** Gọi trước khi đăng xuất (token còn hiệu lực) để BE ngừng gửi push về máy này. Không ném lỗi. */
export class UnregisterPushDevice {
  constructor(
    private readonly devices: PushDeviceRepository,
    private readonly deviceId: DeviceIdProvider,
  ) {}

  async execute(): Promise<void> {
    try {
      await this.devices.unregister(await this.deviceId.get());
    } catch {
      // Không có mạng / BE chưa hỗ trợ: bỏ qua.
    }
  }
}

/** Đặt số trên biểu tượng app bằng số thông báo chưa đọc. */
export class SyncAppBadge {
  constructor(private readonly gateway: PushGateway) {}

  execute(unreadCount: number): Promise<void> {
    return this.gateway.setBadgeCount(unreadCount);
  }
}
