import {
  buildDecision,
  buildItems,
  canApproveCrossDeanery,
  canSubmitCrossDeanery,
  missingReasons,
  type CrossCandidate,
} from './cross-deanery';

const cand = (leaderId: string, eligible: boolean): CrossCandidate => ({
  leaderId,
  holyName: 'Phêrô',
  fullName: `HT ${leaderId}`,
  parishName: null,
  deaneryName: null,
  eligible,
  blockedReason: null,
});

describe('liên giáo hạt', () => {
  it('quyền gửi và quyền đồng ý tách riêng', () => {
    const parish = { roles: [], permissions: ['training.participation.submit.parish'] };
    const approver = { roles: [], permissions: ['training.participation.cross_approve.deanery'] };
    expect(canSubmitCrossDeanery(parish)).toBe(true);
    expect(canApproveCrossDeanery(parish)).toBe(false);
    expect(canApproveCrossDeanery(approver)).toBe(true);
    expect(canSubmitCrossDeanery(approver)).toBe(false);
  });

  it('thiếu lý do gửi, hoặc thiếu lý do ngoại lệ với hồ sơ chưa đủ điều kiện', () => {
    const list = [cand('a', true), cand('b', false), cand('c', false)];
    const drafts = {
      a: { reason: 'Gần nhà', exceptionReason: '', note: '' },
      b: { reason: 'Gần nhà', exceptionReason: '', note: '' },
      c: { reason: 'Gần nhà', exceptionReason: 'Thiếu 1 năm', note: '' },
    };
    expect(missingReasons(list, drafts).map((c) => c.leaderId)).toEqual(['b']);
    expect(missingReasons([cand('z', true)], {}).map((c) => c.leaderId)).toEqual(['z']);
  });

  it('thân gửi: lý do ngoại lệ chỉ cho hồ sơ chưa đủ điều kiện, ghi chú rỗng thì bỏ', () => {
    expect(
      buildItems([cand('a', true), cand('b', false)], {
        a: { reason: ' Gần nhà ', exceptionReason: 'x', note: ' ' },
        b: { reason: 'Gần nhà', exceptionReason: ' Thiếu năm ', note: 'ghi chú' },
      }),
    ).toEqual([
      { leaderId: 'a', reason: 'Gần nhà', exceptionReason: undefined, note: undefined },
      { leaderId: 'b', reason: 'Gần nhà', exceptionReason: 'Thiếu năm', note: 'ghi chú' },
    ]);
  });

  it('quyết định: từ chối cần lý do; đồng ý tất cả không gửi itemIds; đồng ý một phần cần ghi chú', () => {
    expect(buildDecision(false, ' ', [], ['1', '2']).error).toMatch(/lý do từ chối/);
    expect(buildDecision(false, 'Hết chỗ', [], ['1', '2']).body).toEqual({
      approved: false,
      note: 'Hết chỗ',
    });
    expect(buildDecision(true, '', ['1', '2'], ['1', '2'])).toEqual({
      body: { approved: true, note: undefined, itemIds: undefined },
      error: null,
    });
    expect(buildDecision(true, '', ['1'], ['1', '2']).error).toMatch(/ghi chú/);
    expect(buildDecision(true, 'Đủ chỗ 1 người', ['1'], ['1', '2']).body).toEqual({
      approved: true,
      note: 'Đủ chỗ 1 người',
      itemIds: ['1'],
    });
    expect(buildDecision(true, '', [], ['1']).error).toMatch(/ít nhất một hồ sơ/);
  });
});
