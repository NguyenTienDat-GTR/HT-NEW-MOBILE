import { buildInvitationBody, invitationSummary, type InvitationJob } from './invitation';

const job = (over: Partial<InvitationJob> = {}): InvitationJob => ({
  jobId: 'j1',
  status: 'DONE',
  error: null,
  result: { total: 10, sent: 7, skippedAlreadySent: 2, failed: 1, includeQr: true, issues: [] },
  ...over,
});

describe('email thông tin tham dự', () => {
  it('thân gửi chỉ có hai cờ, không kèm danh sách hồ sơ (gửi cho cả khóa)', () => {
    expect(buildInvitationBody({ includeQr: true, resend: false })).toEqual({
      includeQr: true,
      resend: false,
    });
  });

  it('tóm tắt kết quả: đã gửi, đã nhận trước đó, lỗi và lý do từng hồ sơ', () => {
    const summary = invitationSummary(
      job({
        result: {
          total: 10,
          sent: 7,
          skippedAlreadySent: 2,
          failed: 1,
          includeQr: true,
          issues: [
            {
              participationId: 'p9',
              holyName: 'Maria',
              fullName: 'Trần Mai',
              email: null,
              reason: 'Không có email',
            },
          ],
        },
      }),
    );
    expect(summary.message).toBe('Đã gửi 7/10 email, 2 người đã nhận trước đó, 1 không gửi được.');
    expect(summary.failed).toBe(1);
    expect(summary.issues).toEqual([{ key: 'p9', text: 'Maria Trần Mai: Không có email' }]);
  });

  it('tác vụ lỗi thì hiện lỗi của máy chủ', () => {
    expect(invitationSummary(job({ result: null, error: 'Máy chủ thư bận' })).message).toBe(
      'Máy chủ thư bận',
    );
  });
});
