import type { HttpClient } from '@/core/network/http-client';

import type { NotificationDto, PageDto, PushDeviceDto, UnreadCountDto } from './notification-dto';

export class NotificationRemoteDataSource {
  constructor(private readonly http: HttpClient) {}

  list(page: number, size: number): Promise<PageDto<NotificationDto>> {
    return this.http.request({
      method: 'GET',
      path: '/system/notifications',
      query: { page, size },
    });
  }

  unreadCount(): Promise<UnreadCountDto> {
    return this.http.request({ method: 'GET', path: '/system/notifications/unread-count' });
  }

  markRead(id: string): Promise<NotificationDto> {
    return this.http.request({
      method: 'PATCH',
      path: `/system/notifications/${encodeURIComponent(id)}/read`,
    });
  }

  /** Endpoint của BE mobile (PR BE đợt push); BE chưa có thì trả lỗi và app bỏ qua. */
  registerDevice(body: PushDeviceDto): Promise<void> {
    return this.http.request({ method: 'POST', path: '/mobile/push/devices', body });
  }

  unregisterDevice(deviceId: string): Promise<void> {
    return this.http.request({
      method: 'DELETE',
      path: `/mobile/push/devices/${encodeURIComponent(deviceId)}`,
    });
  }
}
