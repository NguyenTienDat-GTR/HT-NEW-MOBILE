import {
  buildDivideBody,
  suggestedTeamCount,
  validateDivide,
  type DivideDraft,
} from './team-divide';

const draft = (over: Partial<DivideDraft> = {}): DivideDraft => ({
  teamCount: '4',
  teamSize: '10',
  namingMode: 'SEQUENTIAL',
  teamNames: '',
  assignmentMode: 'RANDOM',
  maxUnitsPerTeam: '',
  ...over,
});

describe('chia đội', () => {
  it('gợi ý số đội đủ chỗ cho mọi hồ sơ', () => {
    expect(suggestedTeamCount(35, 10)).toBe(4);
    expect(suggestedTeamCount(0, 10)).toBe(0);
    expect(suggestedTeamCount(10, 0)).toBe(0);
  });

  it('hợp lệ thì không có lỗi; báo thiếu chỗ, sai khoảng', () => {
    expect(validateDivide(draft(), 35)).toEqual({});
    expect(validateDivide(draft({ teamSize: '8' }), 35).teamSize).toMatch(/Chưa đủ chỗ/);
    expect(validateDivide(draft({ teamCount: '0' }), 35).teamCount).toBeDefined();
    expect(validateDivide(draft({ teamSize: '' }), 35).teamSize).toBeDefined();
  });

  it('đặt tên tùy chỉnh: đúng số tên và không trùng', () => {
    const custom = draft({ namingMode: 'CUSTOM', teamCount: '2', teamNames: 'Đội Nhất\nđội nhất' });
    expect(validateDivide(custom, 10).teamNames).toMatch(/trùng/);
    expect(validateDivide({ ...custom, teamNames: 'A' }, 10).teamNames).toMatch(/đúng 2 tên/);
    expect(validateDivide({ ...custom, teamNames: 'A\nB' }, 10)).toEqual({});
  });

  it('chia theo đơn vị cần số đơn vị tối đa mỗi đội', () => {
    expect(
      validateDivide(draft({ assignmentMode: 'UNIT_LIMIT' }), 10).maxUnitsPerTeam,
    ).toBeDefined();
    expect(
      validateDivide(draft({ assignmentMode: 'UNIT_LIMIT', maxUnitsPerTeam: '2' }), 10),
    ).toEqual({});
  });

  it('thân gửi BE chỉ có tên đội / giới hạn đơn vị khi cần', () => {
    expect(buildDivideBody(draft())).toEqual({
      teamCount: 4,
      teamSize: 10,
      namingMode: 'SEQUENTIAL',
      teamNames: undefined,
      assignmentMode: 'RANDOM',
      maxUnitsPerTeam: undefined,
    });
    expect(
      buildDivideBody(
        draft({
          namingMode: 'CUSTOM',
          teamCount: '2',
          teamNames: ' A \n\nB ',
          assignmentMode: 'UNIT_LIMIT',
          maxUnitsPerTeam: '3',
        }),
      ),
    ).toMatchObject({ teamNames: ['A', 'B'], maxUnitsPerTeam: 3, assignmentMode: 'UNIT_LIMIT' });
  });
});
