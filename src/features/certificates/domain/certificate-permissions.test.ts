import {
  canApproveRow,
  canReissueRow,
  canRevokeRow,
  canSharePdf,
  isBulkEligible,
} from './certificate-permissions';

const user = (...permissions: string[]) => ({ roles: [], permissions });

describe('quyền thao tác chứng nhận', () => {
  it('duyệt và từ chối: cần quyền duyệt, chứng nhận đang chờ, khóa chưa kết thúc', () => {
    const approver = user('training.certificate.approve.deanery');
    expect(canApproveRow(approver, { approvalStatus: 'PENDING' })).toBe(true);
    expect(canApproveRow(approver, { approvalStatus: 'SUBMITTED' })).toBe(true);
    expect(canApproveRow(approver, { approvalStatus: 'APPROVED' })).toBe(false);
    expect(canApproveRow(approver, { approvalStatus: 'REJECTED' })).toBe(false);
    expect(canApproveRow(approver, { approvalStatus: 'PENDING', courseFinished: true })).toBe(
      false,
    );
    // Khóa quá khứ đã kết thúc vẫn duyệt được (chọn ngày duyệt).
    expect(
      canApproveRow(approver, {
        approvalStatus: 'PENDING',
        courseFinished: true,
        coursePast: true,
      }),
    ).toBe(true);
    expect(
      canApproveRow(user('training.certificate.read.deanery'), { approvalStatus: 'PENDING' }),
    ).toBe(false);
  });

  it('thu hồi: chỉ chứng nhận đã duyệt, kể cả khi khóa đã kết thúc', () => {
    const u = user('training.certificate.revoke.diocese');
    expect(canRevokeRow(u, { approvalStatus: 'APPROVED', courseFinished: true })).toBe(true);
    expect(canRevokeRow(u, { approvalStatus: 'PENDING' })).toBe(false);
    expect(canRevokeRow(user(), { approvalStatus: 'APPROVED' })).toBe(false);
  });

  it('cấp lại: chỉ chứng nhận bị thu hồi thủ công, không phải do khóa bị vô hiệu hóa', () => {
    const u = user('training.certificate.reissue.deanery');
    expect(canReissueRow(u, { approvalStatus: 'REVOKED', revocationSource: 'MANUAL' })).toBe(true);
    expect(
      canReissueRow(u, { approvalStatus: 'REVOKED', revocationSource: 'COURSE_DISABLED' }),
    ).toBe(false);
    expect(canReissueRow(u, { approvalStatus: 'APPROVED' })).toBe(false);
  });

  it('chia sẻ PDF: người xem được chứng nhận đã duyệt', () => {
    const reader = user('training.certificate.read.deanery');
    expect(canSharePdf(reader, { approvalStatus: 'APPROVED' })).toBe(true);
    expect(canSharePdf(reader, { approvalStatus: 'REVOKED' })).toBe(false);
    expect(canSharePdf(user(), { approvalStatus: 'APPROVED' })).toBe(false);
  });

  it('hàng loạt: chỉ hồ sơ đang chờ và khóa chưa kết thúc', () => {
    expect(isBulkEligible({ approvalStatus: 'PENDING' })).toBe(true);
    expect(isBulkEligible({ approvalStatus: 'PENDING', courseFinished: true })).toBe(false);
    expect(isBulkEligible({ approvalStatus: 'APPROVED' })).toBe(false);
  });
});
