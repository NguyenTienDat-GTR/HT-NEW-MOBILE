import { validateForm } from '@/shared/resource/form-logic';

import { deaneriesResource } from './deaneries';
import { diocesesResource } from './dioceses';
import { parishesResource } from './parishes';

const user = (permissions: string[], roles: string[]) => ({ roles, permissions });

describe('giáo phận', () => {
  const form = diocesesResource.form!;

  it('bắt buộc tên, liên đoàn và xác nhận đồng ý', () => {
    const errors = validateForm(form, form.initialValues(null, null), 'create');
    expect(Object.keys(errors).sort()).toEqual(['name', 'subjectConsentConfirmed', 'unionName']);
  });

  it('thân gửi bỏ trường rỗng và luôn kèm subjectConsentConfirmed', () => {
    const values = {
      ...form.initialValues(null, null),
      name: '  Giáo phận A ',
      unionName: 'Liên đoàn A',
      patronSaintDay: '08-15',
      subjectConsentConfirmed: true,
    };
    expect(form.toBody(values, 'create', null, null)).toEqual({
      name: 'Giáo phận A',
      unionName: 'Liên đoàn A',
      chaplain: undefined,
      phoneNumber: undefined,
      email: undefined,
      patronSaintDay: '08-15',
      establishmentDate: undefined,
      subjectConsentConfirmed: true,
    });
  });

  it('số điện thoại đơn vị: 10 số, đầu 0, số thứ hai khác 0', () => {
    const base = {
      ...form.initialValues(null, null),
      name: 'A',
      unionName: 'B',
      subjectConsentConfirmed: true,
    };
    expect(validateForm(form, { ...base, phoneNumber: '0912345678' }, 'create')).toEqual({});
    expect(
      validateForm(form, { ...base, phoneNumber: '0012345678' }, 'create').phoneNumber,
    ).toBeDefined();
  });

  it('quyền: chỉ SUPER_ADMIN bật/tắt, chỉ không phải SUPER_ADMIN sửa', () => {
    const superAdmin = user(
      ['organization.diocese.toggle.all', 'organization.diocese.update.all'],
      ['SUPER_ADMIN'],
    );
    const admin = user(['organization.diocese.update.diocese'], ['ADMIN_DIOCESE']);
    expect(diocesesResource.canToggle(superAdmin, {})).toBe(true);
    expect(diocesesResource.canUpdate(superAdmin, {})).toBe(false);
    expect(diocesesResource.canUpdate(admin, {})).toBe(true);
    expect(diocesesResource.canToggle(admin, {})).toBe(false);
  });
});

describe('giáo hạt', () => {
  const form = deaneriesResource.form!;

  it('không gửi dioceseId khi sửa (BE không cho đổi giáo phận)', () => {
    const values = {
      ...form.initialValues({ name: 'X', dioceseId: 'd1' }, null),
      subjectConsentConfirmed: true,
    };
    expect(
      (form.toBody(values, 'edit', { id: '1' }, null) as Record<string, unknown>).dioceseId,
    ).toBeUndefined();
    expect((form.toBody(values, 'create', null, null) as Record<string, unknown>).dioceseId).toBe(
      'd1',
    );
  });

  it('giáo hạt viên chỉ sửa được giáo hạt của mình', () => {
    const admin = {
      ...user(['organization.deanery.update.deanery'], ['ADMIN_DEANERY']),
      deaneryId: 'dn1',
    };
    expect(deaneriesResource.canUpdate(admin, { id: 'dn1' })).toBe(true);
    expect(deaneriesResource.canUpdate(admin, { id: 'dn2' })).toBe(false);
  });
});

describe('giáo xứ', () => {
  const form = parishesResource.form!;
  const base = {
    ...form.initialValues(null, null),
    name: 'Giáo họ Bà Lụa',
    deaneryId: 'dn1',
    subjectConsentConfirmed: true,
  };

  it('giáo họ/điểm bắt buộc giáo xứ cha, giáo xứ thì không', () => {
    expect(validateForm(form, { ...base, unitType: 'PARISH' }, 'create')).toEqual({});
    expect(
      validateForm(form, { ...base, unitType: 'GIAO_HO' }, 'create').parentParishId,
    ).toBeDefined();
  });

  it('thân tạo giáo xứ không gửi parentParishId, giáo họ thì gửi', () => {
    const parish = form.toBody(
      { ...base, unitType: 'PARISH', parentParishId: 'x' },
      'create',
      null,
      null,
    );
    expect((parish as Record<string, unknown>).parentParishId).toBeUndefined();
    const sub = form.toBody(
      { ...base, unitType: 'GIAO_HO', parentParishId: 'p1' },
      'create',
      null,
      null,
    );
    expect(sub).toMatchObject({ unitType: 'GIAO_HO', parentParishId: 'p1', deaneryId: 'dn1' });
  });

  it('khi sửa chỉ gửi trường chung, không đổi loại, giáo hạt hay giáo xứ cha', () => {
    const body = form.toBody(
      { ...base, unitType: 'GIAO_HO', parentParishId: 'p1' },
      'edit',
      {
        id: '1',
      },
      null,
    ) as Record<string, unknown>;
    expect(body.unitType).toBeUndefined();
    expect(body.deaneryId).toBeUndefined();
    expect(body.parentParishId).toBeUndefined();
  });

  it('bật/tắt: quản trị giáo hạt, hoặc quản trị giáo phận có quyền toggle.diocese', () => {
    const deanery = user(['organization.parish.toggle.deanery'], ['ADMIN_DEANERY']);
    const diocese = user(['organization.parish.toggle.diocese'], ['ADMIN_DIOCESE']);
    const noScope = user(['organization.parish.toggle.parish'], ['ADMIN_PARISH']);
    expect(parishesResource.canToggle(deanery, {})).toBe(true);
    expect(parishesResource.canToggle(diocese, {})).toBe(true);
    expect(parishesResource.canToggle(noScope, {})).toBe(false);
  });
});
