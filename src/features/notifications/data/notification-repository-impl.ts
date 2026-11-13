import type { Page } from '@/core/domain/page';

import type { NotificationItem, PushDevice } from '../domain/entities';
import type { NotificationRepository, PushDeviceRepository } from '../domain/repositories';

import { toNotificationPage } from './notification-mapper';
import type { NotificationRemoteDataSource } from './notification-remote-data-source';

export class NotificationRepositoryImpl implements NotificationRepository {
  constructor(private readonly remote: NotificationRemoteDataSource) {}

  async list(page: number, size: number): Promise<Page<NotificationItem>> {
    return toNotificationPage(await this.remote.list(page, size));
  }

  async unreadCount(): Promise<number> {
    return (await this.remote.unreadCount()).unreadCount ?? 0;
  }

  async markRead(id: string): Promise<void> {
    await this.remote.markRead(id);
  }
}

export class PushDeviceRepositoryImpl implements PushDeviceRepository {
  constructor(private readonly remote: NotificationRemoteDataSource) {}

  register(device: PushDevice): Promise<void> {
    return this.remote.registerDevice(device);
  }

  unregister(deviceId: string): Promise<void> {
    return this.remote.unregisterDevice(deviceId);
  }
}
