import type { AccountRepository } from './repository';
import { ChangeMyEmail, ChangePasswordWithToken } from './usecases';
import { approvalStatusLabel, displayName, leaderLevelName, primaryRoleName } from './labels';

const repo = (overrides: Partial<AccountRepository>) => overrides as AccountRepository;

describe('ChangeMyEmail', () => {
  it('chặn email sai định dạng hoặc thiếu mật khẩu, không gọi BE', async () => {
    const changeEmail = jest.fn();
    const useCase = new ChangeMyEmail(repo({ changeEmail }));
    await expect(useCase.execute('khong-phai-email', 'pw')).rejects.toMatchObject({
      message: 'Email không hợp lệ',
    });
    await expect(useCase.execute('a@b.vn', '')).rejects.toMatchObject({ kind: 'validation' });
    expect(changeEmail).not.toHaveBeenCalled();
  });

  it('hợp lệ thì cắt khoảng trắng rồi gửi', async () => {
    const changeEmail = jest.fn().mockResolvedValue(undefined);
    await new ChangeMyEmail(repo({ changeEmail })).execute('  a@b.vn ', 'pw');
    expect(changeEmail).toHaveBeenCalledWith('a@b.vn', 'pw');
  });
});

describe('ChangePasswordWithToken', () => {
  it('kiểm tra độ dài và nhập lại khớp trước khi gọi BE', async () => {
    const changePassword = jest.fn().mockResolvedValue(undefined);
    const useCase = new ChangePasswordWithToken(repo({ changePassword }));
    await expect(useCase.execute('t', 'ngan', 'ngan')).rejects.toMatchObject({
      kind: 'validation',
    });
    await expect(useCase.execute('t', 'Abcdef12', 'Abcdef13')).rejects.toMatchObject({
      message: 'Mật khẩu nhập lại không khớp',
    });
    expect(changePassword).not.toHaveBeenCalled();
    await useCase.execute('t', 'Abcdef12', 'Abcdef12');
    expect(changePassword).toHaveBeenCalledWith('t', 'Abcdef12', 'Abcdef12');
  });
});

describe('labels', () => {
  it('tên cấp, tên hiển thị, vai trò chính', () => {
    expect(leaderLevelName('HT_II')).toBe('Huynh trưởng cấp II');
    expect(leaderLevelName('MA_LA')).toBe('MA_LA');
    expect(displayName(undefined, 'ht01')).toBe('ht01');
    expect(
      displayName(
        {
          username: 'ht01',
          roles: [],
          email: null,
          hasLeader: true,
          canEditBirthDate: false,
          imageUrl: null,
          rankHistory: [],
          certificates: [],
          leader: {
            id: '1',
            holyName: 'Phêrô',
            fullName: 'Nguyễn Văn A',
            birthDate: null,
            imageUrl: null,
            email: null,
            phoneNumber: null,
            gender: null,
            leaderLevel: null,
            deaneryName: null,
            parishName: null,
          },
        },
        'ht01',
      ),
    ).toBe('Phêrô Nguyễn Văn A');
    expect(primaryRoleName(undefined, ['ROLE_ADMIN_PARISH'])).toBe('Admin Xứ đoàn');
    expect(primaryRoleName(undefined, [])).toBe('Chưa có vai trò');
  });

  it('trạng thái duyệt: nhãn tiếng Việt và tông màu', () => {
    expect(approvalStatusLabel('APPROVED')).toEqual({ label: 'Đã duyệt', tone: 'success' });
    expect(approvalStatusLabel('REJECTED').tone).toBe('danger');
    expect(approvalStatusLabel('PENDING')).toEqual({ label: 'Chờ duyệt', tone: 'warning' });
    expect(approvalStatusLabel(null).label).toBe('Chờ duyệt');
  });
});
