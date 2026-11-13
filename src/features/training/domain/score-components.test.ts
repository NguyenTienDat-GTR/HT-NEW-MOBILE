import {
  DEFAULT_SCORE_COMPONENT,
  maxFinalScore,
  parseScoreComponents,
  scoreComponentsBody,
  scoreComponentsError,
  stringifyScoreComponents,
} from './score-components';

const row = (over: Partial<typeof DEFAULT_SCORE_COMPONENT> = {}) => ({
  ...DEFAULT_SCORE_COMPONENT,
  name: 'Thi',
  ...over,
});

describe('thành phần điểm của khóa', () => {
  it('điểm tổng kết tối đa là trung bình có hệ số của các thành phần được tính', () => {
    expect(
      maxFinalScore([
        row({ maxScore: '10', coefficient: '1' }),
        row({ maxScore: '100', coefficient: '3' }),
      ]),
    ).toBe(77.5);
    expect(maxFinalScore([row({ includeInFinal: false })])).toBeNull();
  });

  it('báo lỗi tiếng Việt cho từng thành phần', () => {
    expect(scoreComponentsError([])).toMatch(/ít nhất một thành phần/);
    expect(scoreComponentsError([row({ name: ' ' })])).toMatch(/Thành phần 1: vui lòng nhập tên/);
    expect(scoreComponentsError([row({ maxScore: '0' })])).toMatch(/điểm tối đa/);
    expect(scoreComponentsError([row({ coefficient: '' })])).toMatch(/hệ số/);
    expect(scoreComponentsError([row({ includeInFinal: false })])).toMatch(
      /tính vào điểm tổng kết/,
    );
    expect(scoreComponentsError([row()])).toBeNull();
  });

  it('chuỗi JSON đi và về giữ nguyên; JSON hỏng thì ra danh sách rỗng', () => {
    const rows = [row({ id: 'a' })];
    expect(parseScoreComponents(stringifyScoreComponents(rows))).toEqual(rows);
    expect(parseScoreComponents('không phải json')).toEqual([]);
  });

  it('thân gửi BE: có id thì giữ id, số được đổi từ chuỗi, bỏ cờ hasScores', () => {
    expect(
      scoreComponentsBody([row({ id: 'a', maxScore: '10,5', hasScores: true }), row()]),
    ).toEqual([
      { id: 'a', name: 'Thi', maxScore: 10.5, coefficient: 1, includeInFinal: true },
      { name: 'Thi', maxScore: 10, coefficient: 1, includeInFinal: true },
    ]);
  });
});
