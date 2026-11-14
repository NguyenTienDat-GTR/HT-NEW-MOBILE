import { certificateDetail } from './certificate-view';

const levelOf = (sections: ReturnType<typeof certificateDetail>) =>
  sections.flatMap((section) => section.fields).find((field) => field.label === 'Cấp độ khi đạt')
    ?.value;

describe('chi tiết chứng nhận: cấp độ khi đạt hiển thị theo tên', () => {
  const row = { certificateCode: 'GPPC-1', resultingLevel: 'HT_I' };

  it('tra tên theo danh mục cấp độ của giáo phận', () => {
    const context = [{ levelCode: 'HT_I', levelName: 'Huynh trưởng cấp I (Phú Cường)' }];
    expect(levelOf(certificateDetail(row, context))).toBe('Huynh trưởng cấp I (Phú Cường)');
  });

  it('danh mục chưa tải thì dùng tên mặc định, mã lạ thì giữ nguyên mã', () => {
    expect(levelOf(certificateDetail(row))).toBe('Huynh trưởng cấp I');
    expect(levelOf(certificateDetail({ ...row, resultingLevel: 'XYZ' }, []))).toBe('XYZ');
  });

  it('không có cấp độ thì để trống', () => {
    expect(levelOf(certificateDetail({ certificateCode: 'GPPC-2' }))).toBe('');
  });
});
