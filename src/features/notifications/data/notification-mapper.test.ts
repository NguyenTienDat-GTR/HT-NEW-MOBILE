import { parseNotificationMessage, toNotificationPage } from './notification-mapper';

describe('notification mapper', () => {
  it('đổi trường thiếu thành giá trị mặc định an toàn', () => {
    const page = toNotificationPage({ content: [{ id: 'a' }], number: 2, last: false });
    expect(page.content[0]).toEqual({
      id: 'a',
      eventType: '',
      title: '',
      message: '',
      senderUnitType: null,
      senderUnitId: null,
      courseCode: null,
      payload: null,
      readAt: null,
      createdAt: null,
    });
    expect(page.number).toBe(2);
    expect(page.last).toBe(false);
  });

  it('parseNotificationMessage: đọc tin STOMP hợp lệ, bỏ qua tin hỏng', () => {
    expect(parseNotificationMessage('{"id":"x","title":"T","eventType":"E"}')?.title).toBe('T');
    expect(parseNotificationMessage('{"title":"không có id"}')).toBeNull();
    expect(parseNotificationMessage('không phải json')).toBeNull();
  });
});
