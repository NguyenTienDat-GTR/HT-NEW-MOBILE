import { REALTIME_DESTINATIONS, type RealtimeClient } from '@/core/realtime/realtime-client';

import type { NotificationItem } from '../domain/entities';
import type { NotificationStream } from '../domain/repositories';

import { parseNotificationMessage } from './notification-mapper';

/** Thông báo mới của chính người dùng qua /user/queue/notifications. */
export class StompNotificationStream implements NotificationStream {
  constructor(private readonly realtime: RealtimeClient) {}

  subscribe(handler: (item: NotificationItem) => void): () => void {
    return this.realtime.subscribe(REALTIME_DESTINATIONS.notifications, (body) => {
      const item = parseNotificationMessage(body);
      if (item) handler(item);
    });
  }
}
