import { registrationIso, vnLocalDateTimeOf } from './course-state';

describe('ngày giờ đăng ký (giờ Việt Nam)', () => {
  it('đổi mốc ISO sang ngày giờ Việt Nam và ngược lại', () => {
    expect(vnLocalDateTimeOf('2027-01-01T01:00:00Z')).toBe('2027-01-01T08:00');
    expect(vnLocalDateTimeOf('2027-02-28T10:30:00+07:00')).toBe('2027-02-28T10:30');
    expect(vnLocalDateTimeOf('')).toBe('');
    expect(registrationIso('2027-01-01T08:00')).toBe('2027-01-01T08:00:00+07:00');
  });
});
