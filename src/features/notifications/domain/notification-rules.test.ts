import {
  notificationDetail,
  notificationGroupOf,
  appPathOf,
  notificationPath,
  unreadBadgeLabel,
} from './notification-rules';

const base = { courseCode: null, senderUnitType: null, senderUnitId: null } as const;

describe('notificationGroupOf', () => {
  it('phân nhóm giống web', () => {
    expect(notificationGroupOf({ eventType: 'training.certificate.approved' })).toBe('certificate');
    expect(notificationGroupOf({ eventType: 'training.registration.submitted' })).toBe('training');
    expect(notificationGroupOf({ eventType: 'ACCOUNT_PERMISSION_GRANTED' })).toBe('access');
    expect(notificationGroupOf({ eventType: 'UNIT_STATUS_TOGGLED' })).toBe('unit');
    expect(notificationGroupOf({ eventType: 'LEADER_PARISH_TRANSFERRED' })).toBe('unit');
    expect(notificationGroupOf({ eventType: 'gì đó khác' })).toBe('other');
  });
});

describe('notificationPath', () => {
  it('điều hướng theo loại sự kiện (cùng đường dẫn với web)', () => {
    expect(notificationPath({ ...base, eventType: 'training.certificate.revoked' })).toBe(
      '/certificates',
    );
    expect(notificationPath({ ...base, eventType: 'training.cross_deanery.course_opened' })).toBe(
      '/training/cross-deanery?tab=invitations',
    );
    expect(notificationPath({ ...base, eventType: 'training.cross_deanery.approved' })).toBe(
      '/training/cross-deanery',
    );
    expect(
      notificationPath({
        ...base,
        eventType: 'training.registration.approved',
        courseCode: 'K 1/2',
      }),
    ).toBe('/training/courses/K%201%2F2');
    expect(notificationPath({ ...base, eventType: 'training.registration.approved' })).toBe(
      '/training/courses',
    );
    expect(notificationPath({ ...base, eventType: 'ROLE_PERMISSION_REVOKED' })).toBe(
      '/my-permissions',
    );
    expect(notificationPath({ ...base, eventType: 'ROLE_TOGGLED' })).toBe('/system/roles');
    expect(
      notificationPath({
        ...base,
        eventType: 'UNIT_STATUS_TOGGLED',
        senderUnitType: 'PARISH',
        senderUnitId: 'p1',
      }),
    ).toBe('/organization/parishes?detail=p1');
    expect(notificationPath({ ...base, eventType: 'không rõ' })).toBe('/notifications');
  });
});

describe('notificationDetail', () => {
  it('đọc payload hợp lệ, bỏ qua payload hỏng hoặc sai kiểu', () => {
    const ok = notificationDetail({
      payload: JSON.stringify({ kind: 'DECISION_LIST', items: [{ label: 'HT A' }] }),
    });
    expect(ok?.items).toHaveLength(1);
    expect(notificationDetail({ payload: null })).toBeNull();
    expect(notificationDetail({ payload: '{không phải json' })).toBeNull();
    expect(notificationDetail({ payload: JSON.stringify({ kind: 'KHAC', items: [] }) })).toBeNull();
    expect(notificationDetail({ payload: JSON.stringify({ kind: 'DECISION_LIST' }) })).toBeNull();
  });
});

describe('unreadBadgeLabel', () => {
  it('ẩn khi 0, "99+" khi quá 99', () => {
    expect(unreadBadgeLabel(0)).toBeNull();
    expect(unreadBadgeLabel(undefined)).toBeNull();
    expect(unreadBadgeLabel(7)).toBe('7');
    expect(unreadBadgeLabel(100)).toBe('99+');
  });
});

describe('appPathOf', () => {
  it('đổi đường dẫn web sang màn của app', () => {
    expect(appPathOf('/certificates')).toBe('/res/certificates');
    expect(appPathOf('/training/courses/K%201')).toBe('/res/courses/K%201');
    expect(appPathOf('/training/courses')).toBe('/res/courses');
    expect(appPathOf('/training/cross-deanery?tab=invitations')).toBe(
      '/res/cross-deanery?tab=invitations',
    );
    expect(appPathOf('/system/role-permissions')).toBe('/res/role-permissions');
    expect(appPathOf('/leaders/profiles')).toBe('/res/leaders');
    expect(appPathOf('/organization/parishes?detail=p1')).toBe('/res/parishes/p1');
    expect(appPathOf('/organization/deaneries')).toBe('/res/deaneries');
    expect(appPathOf('/my-permissions')).toBe('/my-permissions');
  });
});
