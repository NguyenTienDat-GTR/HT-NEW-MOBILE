export type SenderUnitType = 'DIOCESE' | 'DEANERY' | 'PARISH';

/** Thông báo của người dùng (bảng training_notification ở BE). */
export interface NotificationItem {
  id: string;
  eventType: string;
  title: string;
  message: string;
  senderUnitType: SenderUnitType | null;
  senderUnitId: string | null;
  courseCode: string | null;
  /** Chuỗi JSON chi tiết (danh sách hồ sơ gom nhóm, danh sách quyền vừa phân); xem notification-rules. */
  payload: string | null;
  readAt: string | null;
  createdAt: string | null;
}

/** Thiết bị nhận push của người dùng. */
export interface PushDevice {
  deviceId: string;
  pushToken: string;
  platform: 'ios' | 'android';
  appVersion: string;
}
