import { validateForm } from '@/shared/resource/form-logic';

import { buildRegistrationBody, missingReasons } from '../domain/registration-body';
import { organizingState, registrationState } from '../domain/course-state';
import { canActOnCourse, canRegisterCourse } from '../domain/training-permissions';

import { courseTypesResource } from './course-types-resource';
import { coursesResource } from './courses-resource';
import { participantsResource, registrationsResource } from './participations-resources';

const user = (permissions: string[], extra: Record<string, unknown> = {}) => ({
  roles: ['ADMIN_DEANERY'],
  permissions,
  username: 'ht.hat',
  dioceseId: 'd1',
  deaneryId: 'dn1',
  ...extra,
});

describe('loại khóa', () => {
  const form = courseTypesResource.form!;

  it('sửa: bỏ khóa tiên quyết và cấp độ hoàn thành thì gửi cờ xóa', () => {
    const row = {
      typeCode: 'T1',
      prerequisiteTypeCode: 'T0',
      maxYearsAfterPrerequisite: 3,
      resultingLevel: 'HT_I',
    };
    const values = {
      ...form.initialValues(row, null),
      typeName: 'Cấp II',
      managementUnitType: 'DEANERY',
      prerequisiteTypeCode: '',
      resultingLevel: '',
    };
    expect(form.toBody(values, 'edit', row, null)).toMatchObject({
      clearPrerequisite: true,
      clearMaxYearsAfterPrerequisite: true,
      clearResultingLevel: true,
    });
  });

  it('tạo: mã viết tắt chứng chỉ chỉ bắt buộc khi có cấp chứng nhận', () => {
    const base = {
      ...form.initialValues(null, null),
      typeName: 'A',
      managementUnitType: 'DIOCESE',
    };
    expect(validateForm(form, base, 'create')).toEqual({});
    expect(
      validateForm(form, { ...base, hasCertificate: true }, 'create').certificateShortCode,
    ).toBeDefined();
  });
});

describe('khóa huấn luyện', () => {
  const form = coursesResource.form!;
  const filled = {
    ...form.initialValues(null, null),
    courseName: 'HL cấp I 2027',
    courseTypeCode: 'T1',
    startDate: '2027-03-10',
    endDate: '2027-03-12',
    registrationStartAt: '2027-01-01T08:00',
    registrationEndAt: '2027-02-28T17:30',
    passingScore: '5',
    scoreComponents: JSON.stringify([
      { name: 'Thi', maxScore: '10', coefficient: '1', includeInFinal: true },
    ]),
  };

  it('hợp lệ thì không có lỗi; ngày kết thúc không trước ngày bắt đầu', () => {
    expect(validateForm(form, filled, 'create')).toEqual({});
    expect(
      validateForm(form, { ...filled, endDate: '2027-03-01' }, 'create').endDate,
    ).toBeDefined();
  });

  it('điểm đạt không vượt điểm tổng kết tối đa; đóng đăng ký không sau ngày bắt đầu', () => {
    expect(
      validateForm(form, { ...filled, passingScore: '11' }, 'create').passingScore,
    ).toBeDefined();
    expect(
      validateForm(form, { ...filled, registrationEndAt: '2027-03-11T09:00' }, 'create')
        .registrationEndAt,
    ).toBeDefined();
  });

  it('không mở đăng ký thì bỏ ngày đăng ký; năm tổ chức mặc định theo ngày bắt đầu', () => {
    const body = form.toBody(
      { ...filled, registrationEnabled: false },
      'create',
      null,
      null,
    ) as Record<string, unknown>;
    expect(body.registrationStartAt).toBeUndefined();
    expect(body.hostYear).toBe(2027);
    const open = form.toBody(filled, 'create', null, null) as Record<string, unknown>;
    expect(open.registrationStartAt).toBe('2027-01-01T08:00:00+07:00');
    expect(open.registrationEndAt).toBe('2027-02-28T17:30:00+07:00');
  });

  it('khóa đã có hồ sơ thì khóa các ô loại khóa, năm, số năm hoạt động, điểm đạt', () => {
    const locked = form.fields.filter((f) => f.readOnlyWhen?.({ hasParticipations: true }, 'edit'));
    expect(locked.map((f) => f.name).sort()).toEqual(
      ['courseTypeCode', 'hostYear', 'passingScore', 'yearsActive'].sort(),
    );
    expect(form.fields.some((f) => f.readOnlyWhen?.({ hasParticipations: true }, 'create'))).toBe(
      false,
    );
  });

  it('khóa đã kết thúc thì không sửa được', () => {
    const admin = user(['training.course.update.deanery']);
    const open = { managementUnitType: 'DEANERY', deaneryId: 'dn1', endDate: '2999-01-01' };
    expect(coursesResource.canUpdate(admin, open)).toBe(true);
    expect(coursesResource.canUpdate(admin, { ...open, finishedAt: '2026-01-01T00:00:00Z' })).toBe(
      false,
    );
    expect(coursesResource.canUpdate(admin, { ...open, deaneryId: 'dn2' })).toBe(false);
  });
});

describe('trạng thái khóa', () => {
  const now = Date.parse('2027-03-11T05:00:00Z');

  it('khóa đã diễn ra thì đăng ký luôn là hết hạn, kể cả khi cờ mở đăng ký còn bật', () => {
    const row = { startDate: '2027-03-10', endDate: '2027-03-12', registrationEnabled: true };
    expect(organizingState(row, now)).toBe('ONGOING');
    expect(registrationState(row, now)).toBe('ENDED');
  });

  it('khóa sắp diễn ra: không mở đăng ký, hoặc theo khung thời gian', () => {
    const base = { startDate: '2027-06-01', endDate: '2027-06-03' };
    expect(registrationState({ ...base, registrationEnabled: false }, now)).toBe('DISABLED');
    expect(
      registrationState({ ...base, registrationStartAt: '2027-04-01T00:00:00+07:00' }, now),
    ).toBe('NOT_STARTED');
    expect(
      registrationState({ ...base, registrationEndAt: '2027-03-01T00:00:00+07:00' }, now),
    ).toBe('ENDED');
    expect(registrationState(base, now)).toBe('OPEN');
  });
});

describe('quyền theo khóa', () => {
  it('giáo xứ gửi được cho khóa giáo hạt của mình và khóa giáo phận chủ quản, không gửi cho giáo hạt khác', () => {
    const parish = user(['training.participation.submit.parish']);
    expect(canRegisterCourse(parish, { managementUnitType: 'DEANERY', deaneryId: 'dn1' })).toBe(
      true,
    );
    expect(canRegisterCourse(parish, { managementUnitType: 'DEANERY', deaneryId: 'dn2' })).toBe(
      false,
    );
    expect(canRegisterCourse(parish, { managementUnitType: 'DIOCESE', dioceseId: 'd1' })).toBe(
      true,
    );
    expect(canRegisterCourse(parish, { managementUnitType: 'DIOCESE', dioceseId: 'd2' })).toBe(
      false,
    );
  });

  it('khóa giáo phận cần quyền cấp giáo phận, khóa giáo hạt cần quyền cấp giáo hạt', () => {
    const deanery = user(['training.participation.approve.deanery']);
    expect(
      canActOnCourse(deanery, { managementUnitType: 'DEANERY', deaneryId: 'dn1' }, 'approve'),
    ).toBe(true);
    expect(
      canActOnCourse(deanery, { managementUnitType: 'DIOCESE', dioceseId: 'd1' }, 'approve'),
    ).toBe(false);
  });
});

describe('gửi đăng ký', () => {
  const entry = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    name: `HT ${id}`,
    unit: '',
    offTarget: false,
    reason: '',
    ...over,
  });

  it('báo lỗi khi danh sách rỗng, trùng người, thiếu lý do ngoại lệ hoặc lý do ngoài đợt', () => {
    expect(missingReasons([], [])).toMatch(/lập danh sách/);
    expect(missingReasons([entry('a')], [entry('a', { reason: 'x' })])).toMatch(/trùng/);
    expect(missingReasons([], [entry('b')])).toMatch(/ngoại lệ cần lý do/);
    expect(missingReasons([entry('c', { offTarget: true })], [])).toMatch(/ngoài đợt/);
    expect(missingReasons([entry('d')], [entry('e', { reason: 'Mới tuyển' })])).toBeNull();
  });

  it('thân gửi BE gồm leaderIds, lý do ngoại lệ và lý do ngoài đợt theo từng người', () => {
    expect(
      buildRegistrationBody(
        'PARISH',
        [entry('a'), entry('b', { offTarget: true, reason: ' Liên xứ ' })],
        [entry('c', { reason: 'Chưa đủ năm' })],
      ),
    ).toEqual({
      senderType: 'PARISH',
      leaderIds: ['a', 'b'],
      exceptionReasonsByLeaderId: { c: 'Chưa đủ năm' },
      offTargetReasonsByLeaderId: { b: 'Liên xứ' },
    });
    expect(buildRegistrationBody('', [entry('a')], [])).toEqual({ leaderIds: ['a'] });
  });
});

describe('thu hồi đăng ký và chuyển hồ sơ khỏi danh sách tham dự', () => {
  it('chỉ người gửi thu hồi hồ sơ của mình khi còn chờ duyệt hoặc bị từ chối', () => {
    const sender = user(['training.participation.submit.parish']);
    expect(
      registrationsResource.canToggle(sender, { approvalStatus: 'PENDING', createdBy: 'ht.hat' }),
    ).toBe(true);
    expect(
      registrationsResource.canToggle(sender, { approvalStatus: 'REJECTED', createdBy: 'ht.hat' }),
    ).toBe(true);
    expect(
      registrationsResource.canToggle(sender, { approvalStatus: 'APPROVED', createdBy: 'ht.hat' }),
    ).toBe(false);
    expect(
      registrationsResource.canToggle(sender, { approvalStatus: 'PENDING', createdBy: 'khac' }),
    ).toBe(false);
  });

  it('người duyệt chuyển hồ sơ về từ chối, trừ khóa đã kết thúc', () => {
    const approver = user(['training.participation.approve.deanery']);
    expect(participantsResource.canToggle(approver, { courseFinished: false })).toBe(true);
    expect(participantsResource.canToggle(approver, { courseFinished: true })).toBe(false);
  });
});
