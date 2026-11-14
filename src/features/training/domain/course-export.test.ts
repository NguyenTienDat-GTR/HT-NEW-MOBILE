import {
  badgeConfigLabel,
  badgeExportBody,
  exportLevelOf,
  templateExportQuery,
  templateGroupOptions,
} from './course-export';

const user = (permissions: string[], roles: string[] = ['ADMIN_DEANERY']) => ({
  roles,
  permissions,
});

describe('xuất file từ khóa', () => {
  it('cấp xuất theo hậu tố quyền hồ sơ tham dự', () => {
    expect(exportLevelOf(null)).toBe('PARISH');
    expect(exportLevelOf(user(['training.participation.read.parish']))).toBe('PARISH');
    expect(exportLevelOf(user(['training.participation.read.deanery']))).toBe('DEANERY');
    expect(exportLevelOf(user(['training.participation.approve.diocese']))).toBe('DIOCESE');
    expect(exportLevelOf(user([], ['SUPER_ADMIN']))).toBe('DIOCESE');
  });

  it('lựa chọn gom nhóm theo cấp', () => {
    expect(templateGroupOptions('PARISH')).toEqual([]);
    expect(templateGroupOptions('DEANERY')).toEqual(['NONE', 'PARISH']);
    expect(templateGroupOptions('DIOCESE')).toEqual(['NONE', 'DEANERY', 'PARISH']);
  });

  it('tham số xuất theo mẫu: khóa nằm trong filters, gom nhóm lùi về mặc định khi không hợp lệ', () => {
    expect(
      templateExportQuery('K1', 'DEANERY', 'FILE_PER_GROUP', ['NONE', 'DEANERY', 'PARISH']),
    ).toEqual({
      filters: '{"course.courseCode":"K1"}',
      groupBy: 'DEANERY',
      layout: 'FILE_PER_GROUP',
    });
    // Giáo xứ không có lựa chọn: một danh sách một sheet.
    expect(templateExportQuery('K1', 'DEANERY', 'FILE_PER_GROUP', []).layout).toBe('SINGLE_SHEET');
    expect(templateExportQuery('K1', 'DEANERY', 'FILE_PER_GROUP', []).groupBy).toBe('NONE');
    // Giáo hạt không gom theo giáo hạt: lùi về giáo xứ.
    expect(
      templateExportQuery('K1', 'DEANERY', 'SHEET_PER_GROUP', ['NONE', 'PARISH']).groupBy,
    ).toBe('PARISH');
    // Không gom nhóm thì luôn một sheet.
    expect(templateExportQuery('K1', 'NONE', 'FILE_PER_GROUP', ['NONE', 'PARISH']).layout).toBe(
      'SINGLE_SHEET',
    );
  });

  it('thân xuất thẻ chỉ gửi trường có giá trị', () => {
    expect(badgeExportBody({ includeBack: true, flipEdge: 'LONG' })).toEqual({
      includeBack: true,
      flipEdge: 'LONG',
    });
    expect(
      badgeExportBody({
        configId: 'c1',
        teamName: ' Đội 1 ',
        includeBack: false,
        flipEdge: 'SHORT',
      }),
    ).toEqual({ configId: 'c1', teamName: 'Đội 1', includeBack: false, flipEdge: 'SHORT' });
  });

  it('nhãn cấu hình thẻ', () => {
    expect(
      badgeConfigLabel({
        id: '1',
        name: 'Thẻ chung',
        applied: true,
        scopeLevel: 'DIOCESE',
        hasBack: true,
        cardWidthMm: 90,
        cardHeightMm: 55,
        cardsPerPage: 10,
      }),
    ).toBe('Thẻ chung · Giáo phận · 90×55 mm · 2 mặt');
  });
});
