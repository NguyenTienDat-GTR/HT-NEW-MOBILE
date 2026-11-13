export interface NotificationDto {
  id: string;
  eventType?: string | null;
  title?: string | null;
  message?: string | null;
  senderUnitType?: 'DIOCESE' | 'DEANERY' | 'PARISH' | null;
  senderUnitId?: string | null;
  courseCode?: string | null;
  payload?: string | null;
  readAt?: string | null;
  createdAt?: string | null;
}

export interface PageDto<T> {
  content?: T[] | null;
  totalElements?: number | null;
  totalPages?: number | null;
  number?: number | null;
  size?: number | null;
  first?: boolean | null;
  last?: boolean | null;
}

export interface UnreadCountDto {
  unreadCount?: number | null;
}

export interface PushDeviceDto {
  deviceId: string;
  pushToken: string;
  platform: 'ios' | 'android';
  appVersion: string;
}
