import {
  buildApproveBody,
  buildBulkApproveBody,
  buildBulkRejectBody,
  buildRejectBody,
  decisionNeeds,
  DEFAULT_SIGNER,
  todayIso,
  validateApprove,
  validateReject,
  type ApproveInput,
} from './certificate-approval';

const input = (over: Partial<ApproveInput> = {}): ApproveInput => ({
  signer: DEFAULT_SIGNER,
  note: '',
  approvalDate: '',
  needs: { approvalDate: false, approveReason: false },
  today: '2027-03-10',
  ...over,
});

describe('duyệt chứng nhận', () => {
  it('cần ngày duyệt khi có chứng nhận khóa quá khứ, cần lý do khi có chứng nhận ngoại lệ', () => {
    expect(decisionNeeds([{}, { coursePast: true }, { exceptionRequested: true }])).toEqual({
      approvalDate: true,
      approveReason: true,
    });
    expect(decisionNeeds([{ coursePast: false }])).toEqual({
      approvalDate: false,
      approveReason: false,
    });
  });

  it('cha tuyên úy của khóa: không cần nhập tên', () => {
    expect(validateApprove(input())).toBeNull();
  });

  it('người ký nhập tay phải có tên; người khác phải có thêm chức danh', () => {
    const chaplain = { type: 'CHAPLAIN' as const, name: ' ', title: '' };
    expect(validateApprove(input({ signer: chaplain }))).toBe('Nhập tên người ký.');
    const other = { type: 'OTHER' as const, name: 'Nguyễn Văn A', title: '' };
    expect(validateApprove(input({ signer: other }))).toBe('Nhập chức danh người ký.');
    expect(validateApprove(input({ signer: { ...other, title: 'Chủ tịch' } }))).toBeNull();
  });

  it('chứng nhận ngoại lệ bắt buộc có lý do duyệt', () => {
    const needs = { approvalDate: false, approveReason: true };
    expect(validateApprove(input({ needs }))).toBe(
      'Chứng nhận ngoại lệ: bắt buộc nhập lý do duyệt.',
    );
    expect(validateApprove(input({ needs, note: 'Đủ năng lực' }))).toBeNull();
  });

  it('khóa quá khứ: bắt buộc chọn ngày duyệt và không được sau hôm nay', () => {
    const needs = { approvalDate: true, approveReason: false };
    expect(validateApprove(input({ needs }))).toBe(
      'Chọn ngày duyệt cho chứng nhận của khóa quá khứ.',
    );
    expect(validateApprove(input({ needs, approvalDate: '2027-03-11' }))).toBe(
      'Ngày duyệt không được sau hôm nay.',
    );
    expect(validateApprove(input({ needs, approvalDate: '2026-05-04' }))).toBeNull();
  });

  it('thân duyệt có người ký; ngày duyệt chỉ gửi khi cần; chức danh mặc định của tuyên úy', () => {
    expect(buildApproveBody(input({ note: ' Ghi chú ' }))).toEqual({
      approvalReason: 'Ghi chú',
      signerType: 'COURSE_CHAPLAIN',
      signerName: '',
      signerTitle: 'Linh mục tuyên úy',
      approvalDate: undefined,
    });
    expect(
      buildApproveBody(
        input({
          signer: { type: 'OTHER', name: ' An ', title: ' Trưởng ban ' },
          needs: { approvalDate: true, approveReason: false },
          approvalDate: '2026-05-04',
        }),
      ),
    ).toMatchObject({
      signerType: 'OTHER',
      signerName: 'An',
      signerTitle: 'Trưởng ban',
      approvalDate: '2026-05-04',
    });
  });

  it('từ chối cần lý do', () => {
    expect(validateReject('  ')).toBe('Nhập lý do từ chối.');
    expect(validateReject('Thiếu hồ sơ')).toBeNull();
    expect(buildRejectBody(' Thiếu hồ sơ ')).toEqual({ reason: 'Thiếu hồ sơ' });
  });

  it('hàng loạt: từ chối chép lý do chung cho từng mã; duyệt dùng chung một người ký', () => {
    expect(buildBulkRejectBody(['A', 'B'], ' Sai thông tin ')).toEqual({
      ids: ['A', 'B'],
      approved: false,
      reason: 'Sai thông tin',
      reasons: { A: 'Sai thông tin', B: 'Sai thông tin' },
    });
    expect(buildBulkApproveBody(['A', 'B'], input())).toEqual({
      ids: ['A', 'B'],
      approved: true,
      reason: undefined,
      signerType: 'COURSE_CHAPLAIN',
      signerName: '',
      signerTitle: 'Linh mục tuyên úy',
      approvalDate: undefined,
    });
  });

  it('todayIso theo giờ máy, đủ hai chữ số', () => {
    expect(todayIso(new Date(2027, 0, 5, 23, 59))).toBe('2027-01-05');
  });
});
