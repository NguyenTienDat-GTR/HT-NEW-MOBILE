import { createContext, useContext, type ReactNode } from 'react';

import type {
  GetUnreadNotificationCount,
  ListNotifications,
  MarkAllNotificationsRead,
  MarkNotificationRead,
  ObserveNotifications,
  RegisterPushDevice,
  SyncAppBadge,
} from '../domain/usecases';

/** Phụ thuộc của tính năng thông báo, do composition root cấp. */
export interface NotificationDependencies {
  listNotifications: ListNotifications;
  getUnreadCount: GetUnreadNotificationCount;
  markRead: MarkNotificationRead;
  markAllRead: MarkAllNotificationsRead;
  observeNotifications: ObserveNotifications;
  registerPushDevice: RegisterPushDevice;
  syncAppBadge: SyncAppBadge;
}

const NotificationDependenciesContext = createContext<NotificationDependencies | null>(null);

export function NotificationProvider({
  deps,
  children,
}: {
  deps: NotificationDependencies;
  children: ReactNode;
}) {
  return (
    <NotificationDependenciesContext.Provider value={deps}>
      {children}
    </NotificationDependenciesContext.Provider>
  );
}

export function useNotificationDependencies(): NotificationDependencies {
  const deps = useContext(NotificationDependenciesContext);
  if (!deps) throw new Error('useNotificationDependencies phải nằm trong <NotificationProvider>');
  return deps;
}
