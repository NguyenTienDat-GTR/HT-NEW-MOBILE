import {
  buildCopyBody,
  defaultLeaderSelection,
  estimateCopyCount,
  inYearWindow,
  matchesCandidate,
  matchesSource,
  parseCopyState,
  stringifyCopyState,
  type CopyCandidate,
  type CopySource,
} from './copy-participants';

const source = (overrides: Partial<CopySource> = {}): CopySource => ({
  courseCode: 'A',
  courseName: 'Huấn luyện Dự trưởng',
  hostYear: 2025,
  participantCount: 10,
  passedCount: 7,
  ...overrides,
});

describe('sao chép danh sách tham dự', () => {
  it('đọc/ghi trạng thái, sai dạng thì rỗng', () => {
    const state = { codes: ['A', 'B'], mode: 'PASSED_ONLY' as const, leaderIds: ['x'] };
    expect(parseCopyState(stringifyCopyState(state))).toEqual(state);
    expect(parseCopyState('')).toEqual({ codes: [], mode: 'ALL' });
    expect(parseCopyState('hỏng')).toEqual({ codes: [], mode: 'ALL' });
  });

  it('cửa sổ 2 năm tính từ năm tổ chức của khóa đích', () => {
    expect(inYearWindow(source({ hostYear: 2026 }), 2026)).toBe(true);
    expect(inYearWindow(source({ hostYear: 2024 }), 2026)).toBe(true);
    expect(inYearWindow(source({ hostYear: 2023 }), 2026)).toBe(false);
    expect(inYearWindow(source({ hostYear: 2027 }), 2026)).toBe(false);
    expect(inYearWindow(source({ hostYear: 2000 }), null)).toBe(true);
  });

  it('tìm khóa theo mọi từ trong tên, năm, loại khóa', () => {
    expect(matchesSource(source(), 'dự trưởng 2025')).toBe(true);
    expect(matchesSource(source(), 'khác')).toBe(false);
  });

  it('ước tính số hồ sơ theo cách sao chép', () => {
    const list = [source(), source({ courseCode: 'B', participantCount: 5, passedCount: 1 })];
    expect(estimateCopyCount(list, ['A', 'B'], 'ALL')).toBe(15);
    expect(estimateCopyCount(list, ['A', 'B'], 'PASSED_ONLY')).toBe(8);
    expect(estimateCopyCount(list, [], 'ALL')).toBe(0);
  });

  it('chọn sẵn hồ sơ: bỏ hồ sơ bị chặn, cách "chỉ đạt" chỉ lấy hồ sơ đạt', () => {
    const list: CopyCandidate[] = [
      { leaderId: '1', finalResult: 'PASSED' },
      { leaderId: '2', finalResult: 'FAILED' },
      { leaderId: '3', finalResult: 'PASSED', blockedReason: 'Đã có trong khóa' },
    ];
    expect(defaultLeaderSelection(list, false)).toEqual(['1', '2']);
    expect(defaultLeaderSelection(list, true)).toEqual(['1']);
  });

  it('lọc hồ sơ theo từ khóa và kết quả', () => {
    const item: CopyCandidate = {
      leaderId: '1',
      holyName: 'Phêrô',
      fullName: 'Nguyễn Văn A',
      parishName: 'Phú Cường',
      finalResult: 'PASSED',
    };
    expect(matchesCandidate(item, 'phêrô phú', '')).toBe(true);
    expect(matchesCandidate(item, '', 'FAILED')).toBe(false);
    expect(matchesCandidate(item, 'xyz', '')).toBe(false);
  });

  it('thân gửi BE: rỗng khi chưa chọn khóa, copyLeaderIds chỉ khi chọn riêng', () => {
    expect(buildCopyBody({ codes: [], mode: 'ALL' })).toEqual({});
    expect(buildCopyBody({ codes: ['A'], mode: 'ALL' })).toEqual({
      copySourceCourseCodes: ['A'],
      copyMode: 'ALL',
    });
    expect(buildCopyBody({ codes: ['A'], mode: 'PASSED_ONLY', leaderIds: ['1'] })).toEqual({
      copySourceCourseCodes: ['A'],
      copyMode: 'PASSED_ONLY',
      copyLeaderIds: ['1'],
    });
  });
});
