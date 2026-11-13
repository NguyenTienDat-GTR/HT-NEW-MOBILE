import type { NotificationItem } from './entities';

/**
 * Quy tắc nghiệp vụ thuần về thông báo, port từ FE/src/modules/notifications/notification-meta.ts
 * để hai nền tảng phân nhóm và điều hướng giống nhau.
 */

export type NotificationGroup = 'training' | 'certificate' | 'access' | 'unit' | 'other';

export const NOTIFICATION_GROUPS: readonly {
  key: Exclude<NotificationGroup, 'other'>;
  label: string;
}[] = [
  { key: 'training', label: 'Khóa huấn luyện' },
  { key: 'certificate', label: 'Chứng chỉ' },
  { key: 'access', label: 'Tài khoản & quyền' },
  { key: 'unit', label: 'Đơn vị' },
];

const ACCESS_EVENTS = new Set([
  'ROLE_TOGGLED',
  'PERMISSION_TOGGLED',
  'ACCOUNT_ROLE_TOGGLED',
  'ROLE_PERMISSION_TOGGLED',
  'ACCOUNT_PERMISSION_TOGGLED',
  'ROLE_PERMISSION_GRANTED',
  'ACCOUNT_PERMISSION_GRANTED',
  'ROLE_PERMISSION_REVOKED',
  'ACCOUNT_PERMISSION_REVOKED',
  'ROLE_PERMISSION_EXPIRED',
  'ACCOUNT_PERMISSION_EXPIRED',
]);

const LEADER_TRANSFERRED_EVENT = 'LEADER_PARISH_TRANSFERRED';
export const MY_PERMISSIONS_PATH = '/my-permissions';
export const NOTIFICATIONS_PATH = '/notifications';

export function notificationGroupOf(item: Pick<NotificationItem, 'eventType'>): NotificationGroup {
  const type = item.eventType;
  if (type.startsWith('training.certificate.')) return 'certificate';
  if (type.startsWith('training.')) return 'training';
  if (ACCESS_EVENTS.has(type)) return 'access';
  if (type === 'UNIT_STATUS_TOGGLED' || type === LEADER_TRANSFERRED_EVENT) return 'unit';
  return 'other';
}

const ACCESS_ROUTES: Record<string, string> = {
  ROLE_TOGGLED: '/system/roles',
  PERMISSION_TOGGLED: '/system/permissions',
  ACCOUNT_ROLE_TOGGLED: '/system/account-roles',
  ROLE_PERMISSION_TOGGLED: '/system/role-permissions',
  ACCOUNT_PERMISSION_TOGGLED: '/system/account-permissions',
  ROLE_PERMISSION_GRANTED: MY_PERMISSIONS_PATH,
  ACCOUNT_PERMISSION_GRANTED: MY_PERMISSIONS_PATH,
  ROLE_PERMISSION_REVOKED: MY_PERMISSIONS_PATH,
  ACCOUNT_PERMISSION_REVOKED: MY_PERMISSIONS_PATH,
  ROLE_PERMISSION_EXPIRED: MY_PERMISSIONS_PATH,
  ACCOUNT_PERMISSION_EXPIRED: MY_PERMISSIONS_PATH,
};

const UNIT_ROUTES = {
  DIOCESE: '/organization/dioceses',
  DEANERY: '/organization/deaneries',
  PARISH: '/organization/parishes',
} as const;

/**
 * Đường dẫn màn hình tương ứng khi bấm vào thông báo (cùng đường dẫn với web). Màn hình chưa có trên mobile
 * được lọc ở lớp presentation bằng danh sách màn đã triển khai.
 */
export function notificationPath(
  item: Pick<NotificationItem, 'eventType' | 'courseCode' | 'senderUnitType' | 'senderUnitId'>,
): string {
  const type = item.eventType;
  if (type.startsWith('training.certificate.')) return '/certificates';
  if (type === 'training.cross_deanery.course_opened') {
    return '/training/cross-deanery?tab=invitations';
  }
  if (type.startsWith('training.cross_deanery.')) return '/training/cross-deanery';
  if (type.startsWith('training.')) {
    return item.courseCode
      ? `/training/courses/${encodeURIComponent(item.courseCode)}`
      : '/training/courses';
  }
  const accessRoute = ACCESS_ROUTES[type];
  if (accessRoute) return accessRoute;
  if (type === LEADER_TRANSFERRED_EVENT) return '/leaders/profiles';
  if (type === 'UNIT_STATUS_TOGGLED' && item.senderUnitType) {
    const base = UNIT_ROUTES[item.senderUnitType];
    return item.senderUnitId ? `${base}?detail=${encodeURIComponent(item.senderUnitId)}` : base;
  }
  return NOTIFICATIONS_PATH;
}

export interface NotificationDetailItem {
  label: string;
  detail?: string;
  note?: string;
  code?: string;
}

export interface NotificationDetail {
  kind: 'DECISION_LIST' | 'PERMISSION_GRANT' | 'PERMISSION_REVOKE';
  heading?: string;
  targetType?: string;
  targetName?: string;
  decision?: string;
  actorName?: string;
  items: NotificationDetailItem[];
}

const DETAIL_KINDS = ['DECISION_LIST', 'PERMISSION_GRANT', 'PERMISSION_REVOKE'];

/** Thông báo gom nhóm / danh sách quyền có payload JSON: mở danh sách chi tiết thay vì chuyển màn hình. */
export function notificationDetail(
  item: Pick<NotificationItem, 'payload'>,
): NotificationDetail | null {
  if (!item.payload) return null;
  try {
    const parsed = JSON.parse(item.payload) as Partial<NotificationDetail> | null;
    if (!parsed || !Array.isArray(parsed.items) || !DETAIL_KINDS.includes(String(parsed.kind))) {
      return null;
    }
    return { ...parsed, kind: parsed.kind as NotificationDetail['kind'], items: parsed.items };
  } catch {
    return null;
  }
}

/** Huy hiệu số chưa đọc: ẩn khi 0, "99+" khi vượt 99. */
export function unreadBadgeLabel(unreadCount?: number | null): string | null {
  if (!unreadCount || unreadCount <= 0) return null;
  return unreadCount > 99 ? '99+' : String(unreadCount);
}
