import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import type { NotificationItem } from '@/features/notifications/domain/entities';
import { openablePath } from '@/features/notifications/presentation/notification-navigation';

type PushData = Pick<
  NotificationItem,
  'eventType' | 'courseCode' | 'senderUnitType' | 'senderUnitId'
>;

function text(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function unitType(value: unknown): PushData['senderUnitType'] {
  return value === 'DIOCESE' || value === 'DEANERY' || value === 'PARISH' ? value : null;
}

/**
 * Component không hiển thị gì; CHỈ dựng trên máy thật (expo-notifications không có API này trên web).
 * Bấm vào push (khi app đang chạy nền hoặc đã tắt hẳn) thì mở đúng màn hình liên quan; màn đích chưa có trên mobile
 * thì mở hộp thư thông báo. `data` của push do BE đặt: eventType, courseCode, senderUnitType, senderUnitId.
 */
export function PushTapNavigator(): null {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;

    const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
    const path = openablePath({
      eventType: text(data.eventType) ?? '',
      courseCode: text(data.courseCode),
      senderUnitType: unitType(data.senderUnitType),
      senderUnitId: text(data.senderUnitId),
    });
    router.push((path ?? '/notifications') as Href);
  }, [response, router]);
  return null;
}
