import { validateForm } from '@/shared/resource/form-logic';

import { parishOptionLabel } from '../domain/leader-labels';

import { leadersResource } from './leaders-resource';

const form = leadersResource.form!;
const user = (permissions: string[], roles: string[]) => ({ roles, permissions });

const filled = {
  holyName: 'Phêrô',
  fullName: 'Nguyễn Văn A',
  birthDate: '2000-05-20',
  gender: 'NAM',
  phoneNumber: '0912345678',
  email: '',
  deaneryId: 'dn1',
  parishId: 'p1',
  leaderLevel: 'NONE',
  subjectConsentConfirmed: true,
};

describe('hồ sơ huynh trưởng', () => {
  it('tạo: thiếu trường bắt buộc và chưa xác nhận đồng ý thì báo lỗi', () => {
    const errors = validateForm(form, form.initialValues(null, null), 'create');
    expect(Object.keys(errors).sort()).toEqual(
      [
        'birthDate',
        'deaneryId',
        'fullName',
        'gender',
        'holyName',
        'leaderLevel',
        'parishId',
        'phoneNumber',
        'subjectConsentConfirmed',
      ].sort(),
    );
    expect(validateForm(form, filled, 'create')).toEqual({});
  });

  it('ngày sinh không được sau hôm nay; số điện thoại phải đủ 10 số', () => {
    expect(
      validateForm(form, { ...filled, birthDate: '2999-01-01' }, 'create').birthDate,
    ).toBeDefined();
    expect(
      validateForm(form, { ...filled, phoneNumber: '12345' }, 'create').phoneNumber,
    ).toBeDefined();
  });

  it('thân tạo không gửi deaneryId (chỉ để lọc giáo xứ) và bỏ email rỗng', () => {
    const body = form.toBody(filled, 'create', null, null) as Record<string, unknown>;
    expect(body.deaneryId).toBeUndefined();
    expect(body.email).toBeUndefined();
    expect(body).toMatchObject({
      fullName: 'Nguyễn Văn A',
      parishId: 'p1',
      subjectConsentConfirmed: true,
    });
  });

  it('sửa: chỉ gửi tên thánh, giới tính, SĐT, email; xóa email thì gửi clearFields', () => {
    const row = { id: '1', email: 'a@x.vn' };
    const body = form.toBody(filled, 'edit', row, null) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(
      [
        'clearFields',
        'email',
        'gender',
        'holyName',
        'phoneNumber',
        'subjectConsentConfirmed',
      ].sort(),
    );
    expect(body.clearFields).toEqual(['email']);
    const kept = form.toBody({ ...filled, email: 'b@x.vn' }, 'edit', row, null) as Record<
      string,
      unknown
    >;
    expect(kept.clearFields).toBeUndefined();
    expect(kept.email).toBe('b@x.vn');
  });

  it('quyền: tạo/bật-tắt cần đúng vai trò và quyền cùng cấp; sửa cần vai trò quản trị đơn vị', () => {
    const parishAdmin = user(
      ['organization.leader.create.parish', 'organization.leader.update.parish'],
      ['ADMIN_PARISH'],
    );
    const wrongRole = user(['organization.leader.create.parish'], ['ADMIN_DEANERY']);
    expect(leadersResource.canCreate(parishAdmin)).toBe(true);
    expect(leadersResource.canCreate(wrongRole)).toBe(false);
    expect(leadersResource.canUpdate(parishAdmin, {})).toBe(true);
    expect(leadersResource.canToggle(parishAdmin, {})).toBe(false);
  });

  it('nhãn giáo xứ: giáo họ/điểm kèm giáo xứ cha', () => {
    expect(parishOptionLabel({ name: 'Phú Cường', unitTypeLabel: 'Giáo xứ' })).toBe('Phú Cường');
    expect(
      parishOptionLabel({
        name: 'Bà Lụa',
        unitTypeLabel: 'Giáo họ',
        parentParishName: 'Phú Cường',
      }),
    ).toBe('Giáo họ Bà Lụa - Phú Cường');
  });
});
