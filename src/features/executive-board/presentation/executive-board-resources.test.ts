import { validateForm } from '@/shared/resource/form-logic';

import { assignmentLevels } from '../domain/executive-board-permissions';

import { assignmentsResource } from './assignments-resource';
import { positionsResource } from './positions-resource';

const user = (permissions: string[]) => ({
  roles: ['ADMIN_PARISH'],
  permissions,
  dioceseId: 'd1',
  deaneryId: 'dn1',
  parishId: 'p1',
});

describe('chức vụ', () => {
  const form = positionsResource.form!;

  it('thứ tự phải là số nguyên từ 1 trở lên; để trống thì không gửi', () => {
    const base = { positionName: 'Phó trưởng', positionType: 'PARISH', displayOrder: '' };
    expect(validateForm(form, base, 'create')).toEqual({});
    expect(validateForm(form, { ...base, displayOrder: '0' }, 'create').displayOrder).toBeDefined();
    expect(
      validateForm(form, { ...base, displayOrder: '2.5' }, 'create').displayOrder,
    ).toBeDefined();
    expect(form.toBody(base, 'create', null, null)).toMatchObject({ displayOrder: undefined });
    expect(form.toBody({ ...base, displayOrder: '3' }, 'create', null, null)).toMatchObject({
      displayOrder: 3,
    });
  });

  it('chọn sẵn loại chức vụ khi chỉ có một cấp được phép tạo', () => {
    const one = user(['organization.position.create.parish']);
    expect(form.initialValues(null, one).positionType).toBe('PARISH');
    const two = user([
      'organization.position.create.parish',
      'organization.position.create.deanery',
    ]);
    expect(form.initialValues(null, two).positionType).toBe('');
  });

  it('quyền sửa/bật-tắt theo cấp của dòng', () => {
    const admin = user([
      'organization.position.update.parish',
      'organization.position.toggle.parish',
    ]);
    expect(positionsResource.canUpdate(admin, { positionType: 'PARISH' })).toBe(true);
    expect(positionsResource.canUpdate(admin, { positionType: 'DEANERY' })).toBe(false);
    expect(positionsResource.canToggle(admin, { positionType: 'PARISH' })).toBe(true);
  });
});

describe('phân công', () => {
  const form = assignmentsResource.form!;
  const admin = user(['organization.executive_board_assignment.create.parish']);

  it('cấp phân công lấy theo quyền kèm đơn vị của tài khoản', () => {
    expect(assignmentLevels(admin)).toEqual([{ unitType: 'PARISH', unitId: 'p1' }]);
    expect(assignmentLevels({ ...admin, parishId: null })).toEqual([
      { unitType: 'PARISH', unitId: null },
    ]);
  });

  it('thân tạo gồm unitId của tài khoản; ngày kết thúc không được trước ngày bắt đầu', () => {
    const values = {
      ...form.initialValues(null, admin),
      leaderId: 'l1',
      positionCode: 'pc1',
      startDate: '2026-11-13',
      endDate: '',
    };
    expect(form.toBody(values, 'create', null, admin)).toEqual({
      unitType: 'PARISH',
      unitId: 'p1',
      leaderId: 'l1',
      positionCode: 'pc1',
      startDate: '2026-11-13',
      endDate: undefined,
    });
    expect(
      validateForm(form, { ...values, endDate: '2026-01-01' }, 'create').endDate,
    ).toBeDefined();
    expect(validateForm(form, values, 'create')).toEqual({});
  });

  it('chỉ kết thúc được phân công đang hiệu lực và có quyền theo cấp', () => {
    const toggler = user(['organization.executive_board_assignment.toggle.parish']);
    expect(assignmentsResource.canToggle(toggler, { unitType: 'PARISH', status: true })).toBe(true);
    expect(assignmentsResource.canToggle(toggler, { unitType: 'PARISH', status: false })).toBe(
      false,
    );
    expect(assignmentsResource.canToggle(toggler, { unitType: 'DEANERY', status: true })).toBe(
      false,
    );
    expect(assignmentsResource.canUpdate(toggler, {})).toBe(false);
  });
});
