import type { MyLeaderProfile } from './entities';
import {
  buildProfileChanges,
  draftFromLeader,
  hasProfileChanges,
  validateProfileDraft,
} from './profile-edit';

const leader: MyLeaderProfile = {
  id: '1',
  holyName: 'Phêrô',
  fullName: 'Nguyễn Văn A',
  birthDate: '1990-05-01',
  email: 'a@example.com',
  phoneNumber: '0901234567',
  gender: 'NAM',
  leaderLevel: null,
  deaneryName: null,
  parishName: null,
  imageUrl: null,
};
const TODAY = '2026-11-14';

describe('sửa hồ sơ cá nhân', () => {
  it('hồ sơ nguyên vẹn thì hợp lệ và không có thay đổi', () => {
    const draft = draftFromLeader(leader);
    expect(validateProfileDraft(draft, true, TODAY)).toEqual({});
    expect(hasProfileChanges(buildProfileChanges(leader, draft, '', true))).toBe(false);
  });

  it('báo lỗi tiếng Việt cho từng trường', () => {
    const errors = validateProfileDraft(
      { holyName: ' ', birthDate: '2999-01-01', gender: '', email: 'sai', phoneNumber: '123' },
      true,
      TODAY,
    );
    expect(errors).toEqual({
      holyName: 'Vui lòng nhập tên thánh',
      birthDate: 'Ngày sinh phải là một ngày trong quá khứ',
      gender: 'Vui lòng chọn giới tính',
      email: 'Email không hợp lệ',
      phoneNumber: 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0',
    });
  });

  it('không có quyền sửa ngày sinh thì không kiểm tra và không gửi ngày sinh', () => {
    const draft = { ...draftFromLeader(leader), birthDate: '' };
    expect(validateProfileDraft(draft, false, TODAY)).toEqual({});
    const changed = { ...draftFromLeader(leader), birthDate: '1991-01-01' };
    expect(buildProfileChanges(leader, changed, '', false)).toEqual({});
    expect(buildProfileChanges(leader, changed, '', true)).toEqual({ birthDate: '1991-01-01' });
  });

  it('chỉ gửi trường đổi; đổi email thì kèm mật khẩu hiện tại', () => {
    const draft = { ...draftFromLeader(leader), holyName: ' Phaolô ', email: 'b@example.com' };
    expect(buildProfileChanges(leader, draft, 'mk', true)).toEqual({
      holyName: 'Phaolô',
      email: 'b@example.com',
      currentPassword: 'mk',
    });
  });
});
