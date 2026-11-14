import type { MyLeaderProfile } from './entities';

/**
 * Tự sửa hồ sơ cá nhân, cùng các trường với sửa hồ sơ huynh trưởng (như edit-profile-dialog của web): tên thánh, giới
 * tính, email, số điện thoại. Họ và tên, giáo xứ, giáo hạt chỉ xem; ngày sinh chỉ sửa được khi tài khoản có quyền sửa
 * ngày sinh.
 */
export interface ProfileDraft {
  holyName: string;
  /** yyyy-MM-dd */
  birthDate: string;
  gender: string;
  email: string;
  phoneNumber: string;
}

/** Thân gửi PUT /auth/me/profile: chỉ các trường thật sự đổi. */
export interface ProfileChanges {
  holyName?: string;
  birthDate?: string;
  gender?: string;
  email?: string;
  phoneNumber?: string;
  /** Bắt buộc khi đổi email. */
  currentPassword?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Số điện thoại VN: 10 chữ số, bắt đầu bằng 0. */
const PHONE_PATTERN = /^0\d{9}$/;

export function draftFromLeader(leader: MyLeaderProfile): ProfileDraft {
  return {
    holyName: leader.holyName ?? '',
    birthDate: leader.birthDate ?? '',
    gender: leader.gender ?? '',
    email: leader.email ?? '',
    phoneNumber: leader.phoneNumber ?? '',
  };
}

/** Lỗi tiếng Việt theo trường. Ngày sinh chỉ kiểm tra khi tài khoản có quyền sửa: không có quyền thì chỉ để xem. */
export function validateProfileDraft(
  draft: ProfileDraft,
  canEditBirthDate: boolean,
  today: string,
): Partial<Record<keyof ProfileDraft, string>> {
  const errors: Partial<Record<keyof ProfileDraft, string>> = {};
  if (!draft.holyName.trim()) errors.holyName = 'Vui lòng nhập tên thánh';
  if (canEditBirthDate) {
    if (!draft.birthDate) errors.birthDate = 'Vui lòng chọn ngày sinh';
    else if (draft.birthDate >= today)
      errors.birthDate = 'Ngày sinh phải là một ngày trong quá khứ';
  }
  if (!draft.gender) errors.gender = 'Vui lòng chọn giới tính';
  if (!EMAIL_PATTERN.test(draft.email.trim())) errors.email = 'Email không hợp lệ';
  if (!draft.phoneNumber.trim()) errors.phoneNumber = 'Số điện thoại là bắt buộc';
  else if (!PHONE_PATTERN.test(draft.phoneNumber.trim()))
    errors.phoneNumber = 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0';
  return errors;
}

/**
 * Chỉ gửi các trường thật sự đổi (BE chỉ kiểm tra trùng email / số điện thoại khi hai giá trị này đổi). Ngày sinh chỉ
 * gửi khi tài khoản có quyền sửa ngày sinh. Đổi email thì kèm mật khẩu hiện tại.
 */
export function buildProfileChanges(
  leader: MyLeaderProfile,
  draft: ProfileDraft,
  currentPassword: string,
  canEditBirthDate: boolean,
): ProfileChanges {
  const original = draftFromLeader(leader);
  const changes: ProfileChanges = {};
  for (const key of ['holyName', 'email', 'phoneNumber'] as const) {
    const value = draft[key].trim();
    if (value !== original[key].trim()) changes[key] = value;
  }
  if (canEditBirthDate && draft.birthDate !== original.birthDate)
    changes.birthDate = draft.birthDate;
  if (draft.gender !== original.gender) changes.gender = draft.gender;
  if (changes.email) changes.currentPassword = currentPassword;
  return changes;
}

/** Có thay đổi thật (không tính mật khẩu xác nhận). */
export const hasProfileChanges = (changes: ProfileChanges): boolean =>
  Object.keys(changes).some((key) => key !== 'currentPassword');
