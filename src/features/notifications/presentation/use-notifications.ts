import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useRealtime } from '@/shared/realtime/realtime-context';

import type { NotificationItem } from '../domain/entities';

import { useNotificationDependencies } from './notifications-context';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;
export const UNREAD_COUNT_QUERY_KEY = ['notifications', 'unread-count'] as const;
const PAGE_SIZE = 20;

/** Danh sách thông báo, cuộn vô hạn (mới nhất trước). */
export function useNotificationList() {
  const deps = useNotificationDependencies();
  return useInfiniteQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, 'list'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => deps.listNotifications.execute(pageParam, PAGE_SIZE),
    getNextPageParam: (last) => (last.last ? undefined : last.number + 1),
  });
}

export function flattenNotifications(
  pages: readonly { content: NotificationItem[] }[] | undefined,
): NotificationItem[] {
  return pages ? pages.flatMap((page) => page.content) : [];
}

export function useUnreadCount(enabled = true) {
  const deps = useNotificationDependencies();
  return useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: () => deps.getUnreadCount.execute(),
    enabled,
    staleTime: 15_000,
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
}

export function useMarkRead() {
  const deps = useNotificationDependencies();
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: string) => deps.markRead.execute(id),
    onSettled: () => void invalidate(),
  });
}

export function useMarkAllRead() {
  const deps = useNotificationDependencies();
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (ids: readonly string[]) => deps.markAllRead.execute(ids),
    onSettled: () => void invalidate(),
  });
}

/** Thông báo mới tới qua STOMP: làm mới danh sách và số chưa đọc. Gọi ở khung sau đăng nhập. */
export function useNotificationRealtime(): void {
  const deps = useNotificationDependencies();
  const realtime = useRealtime();
  const invalidate = useInvalidateNotifications();

  useEffect(() => {
    const unsubscribe = deps.observeNotifications.execute(() => void invalidate());
    return unsubscribe;
    // invalidate đổi tham chiếu mỗi lần render nhưng chỉ phụ thuộc queryClient ổn định.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps, realtime]);
}

/** Đặt số trên biểu tượng app bằng số thông báo chưa đọc. */
export function useAppBadgeSync(unreadCount: number | undefined): void {
  const deps = useNotificationDependencies();
  useEffect(() => {
    if (unreadCount !== undefined) void deps.syncAppBadge.execute(unreadCount);
  }, [deps, unreadCount]);
}

/** Xin quyền và đăng ký thiết bị nhận push mỗi lần mở app sau đăng nhập (lỗi thì bỏ qua, thử lại lần sau). */
export function usePushRegistration(enabled: boolean): void {
  const deps = useNotificationDependencies();
  useEffect(() => {
    if (enabled) void deps.registerPushDevice.execute();
  }, [deps, enabled]);
}
