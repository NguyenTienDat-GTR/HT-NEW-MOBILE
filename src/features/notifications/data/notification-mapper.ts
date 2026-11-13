import type { Page } from '@/core/domain/page';

import type { NotificationItem } from '../domain/entities';

import type { NotificationDto, PageDto } from './notification-dto';

export function toNotification(dto: NotificationDto): NotificationItem {
  return {
    id: dto.id,
    eventType: dto.eventType ?? '',
    title: dto.title ?? '',
    message: dto.message ?? '',
    senderUnitType: dto.senderUnitType ?? null,
    senderUnitId: dto.senderUnitId ?? null,
    courseCode: dto.courseCode ?? null,
    payload: dto.payload ?? null,
    readAt: dto.readAt ?? null,
    createdAt: dto.createdAt ?? null,
  };
}

export function toNotificationPage(dto: PageDto<NotificationDto>): Page<NotificationItem> {
  const content = (dto.content ?? []).map(toNotification);
  return {
    content,
    totalElements: dto.totalElements ?? content.length,
    totalPages: dto.totalPages ?? 1,
    number: dto.number ?? 0,
    size: dto.size ?? content.length,
    first: dto.first ?? true,
    last: dto.last ?? true,
  };
}

/** Thân tin nhắn STOMP là JSON của một thông báo; null nếu không đọc được. */
export function parseNotificationMessage(body: string): NotificationItem | null {
  try {
    const dto = JSON.parse(body) as NotificationDto | null;
    if (!dto || typeof dto.id !== 'string') return null;
    return toNotification(dto);
  } catch {
    return null;
  }
}
