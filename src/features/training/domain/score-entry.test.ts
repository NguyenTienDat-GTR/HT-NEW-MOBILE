import {
  buildScoreBody,
  hasAnyScore,
  previewTotal,
  scoringBlockedReason,
  validateFilledScores,
  validateScores,
  type ScoreComponent,
} from './score-entry';

const components: ScoreComponent[] = [
  { id: 'a', name: 'Lý thuyết', maxScore: 10, coefficient: 1, includeInFinal: true },
  { id: 'b', name: 'Thực hành', maxScore: 10, coefficient: 3, includeInFinal: true },
  { id: 'c', name: 'Chuyên cần', maxScore: 5, coefficient: 1, includeInFinal: false },
];

describe('nhập điểm', () => {
  it('bắt buộc đủ mọi thành phần, số không âm và không vượt điểm tối đa', () => {
    expect(validateScores(components, { a: '8', b: '9', c: '4' })).toEqual({});
    expect(validateScores(components, { a: '8' })).toEqual({
      b: 'Vui lòng nhập điểm',
      c: 'Vui lòng nhập điểm',
    });
    expect(validateScores(components, { a: '11', b: '-1', c: 'abc' })).toEqual({
      a: 'Điểm không được vượt quá 10',
      b: 'Điểm phải là số không âm',
      c: 'Điểm phải là số không âm',
    });
  });

  it('chấp nhận dấu phẩy thập phân kiểu Việt Nam', () => {
    expect(validateScores(components, { a: '8,5', b: '9', c: '4' })).toEqual({});
  });

  it('điểm tổng kết tạm tính theo hệ số, bỏ thành phần không tính vào tổng kết', () => {
    expect(previewTotal(components, { a: '8', b: '9', c: '0' })).toBe(8.75);
    expect(previewTotal(components, { a: '8' })).toBeNull();
  });

  it('thân gửi BE gồm mọi thành phần theo thứ tự và bỏ ghi chú rỗng', () => {
    expect(buildScoreBody(components, { a: '8,5', b: '9', c: '4' }, ' ', ' tốt ')).toEqual({
      componentScores: [
        { componentId: 'a', score: 8.5 },
        { componentId: 'b', score: 9 },
        { componentId: 'c', score: 4 },
      ],
      review: undefined,
      scoreNote: 'tốt',
    });
  });
});

describe('chấm điểm từng cột và điều kiện nhập điểm', () => {
  it('chỉ kiểm tra và chỉ gửi các ô đã nhập', () => {
    expect(validateFilledScores(components, { a: '8' })).toEqual({});
    expect(validateFilledScores(components, { a: '11' })).toEqual({
      a: 'Điểm không được vượt quá 10',
    });
    expect(hasAnyScore(components, { a: ' ' })).toBe(false);
    expect(hasAnyScore(components, { b: '0' })).toBe(true);
    expect(buildScoreBody(components, { b: '9' }, '', '').componentScores).toEqual([
      { componentId: 'b', score: 9 },
    ]);
  });

  it('lý do không nhập điểm được', () => {
    const ongoing = { startDate: '2000-01-01', endDate: '2999-12-31' };
    expect(scoringBlockedReason(ongoing, {})).toBeNull();
    expect(scoringBlockedReason({ ...ongoing, scoreLocked: true }, {})).toMatch(/khóa chỉnh sửa/);
    expect(scoringBlockedReason({ ...ongoing, status: false }, {})).toMatch(/vô hiệu hóa/);
    expect(scoringBlockedReason(ongoing, { certificateApprovalStatus: 'APPROVED' })).toMatch(
      /đã được duyệt/,
    );
    expect(scoringBlockedReason({ startDate: '2999-01-01', endDate: '2999-12-31' }, {})).toMatch(
      /đang diễn ra/,
    );
  });
});
