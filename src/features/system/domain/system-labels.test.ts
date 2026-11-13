import {
  auditOperationLabel,
  auditOperationTone,
  auditStatusText,
  auditStatusTone,
  auditTargetText,
  taxonomyLabel,
} from './system-labels';

describe('nhãn nhật ký và danh mục quyền', () => {
  it('thao tác: nhãn tiếng Việt, thao tác lạ thì viết lại dễ đọc', () => {
    expect(auditOperationLabel('TOGGLE_STATUS')).toBe('Bật/tắt trạng thái');
    expect(auditOperationLabel('CUSTOM_ACTION')).toBe('Custom action');
    expect(auditOperationLabel(undefined)).toBe('');
  });

  it('màu theo thao tác: nguy hiểm đỏ, tạo/duyệt xanh, xem trung tính', () => {
    expect(auditOperationTone('REVOKE')).toBe('danger');
    expect(auditOperationTone('APPROVE')).toBe('success');
    expect(auditOperationTone('VIEW')).toBe('neutral');
    expect(auditOperationTone('UPDATE')).toBe('info');
  });

  it('mã kết quả HTTP: chữ và màu', () => {
    expect(auditStatusText(403)).toBe('Không đủ quyền');
    expect(auditStatusText(418)).toBe('Yêu cầu bị từ chối');
    expect(auditStatusText(503)).toBe('Lỗi hệ thống');
    expect(auditStatusTone(200)).toBe('success');
    expect(auditStatusTone(403)).toBe('warning');
    expect(auditStatusTone(500)).toBe('danger');
  });

  it('đối tượng: tên, không có thì mã, không có cả hai thì rỗng', () => {
    expect(auditTargetText({ resourceName: ' Giáo xứ A ', resourceId: '1' })).toBe('Giáo xứ A');
    expect(auditTargetText({ resourceId: 'abc' })).toBe('Mã abc');
    expect(auditTargetText({})).toBe('');
  });

  it('danh mục quyền: nhãn tiếng Việt, mã lạ giữ nguyên', () => {
    expect(taxonomyLabel('module', 'training')).toBe('Huấn luyện');
    expect(taxonomyLabel('scope', 'ALL')).toBe('Toàn hệ thống');
    expect(taxonomyLabel('action', 'moi_la')).toBe('moi_la');
    expect(taxonomyLabel('resource', undefined)).toBe('');
  });
});
