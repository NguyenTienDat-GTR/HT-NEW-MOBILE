import {
  formatCoursePeriod,
  isCourseEnded,
  organizingState,
  registrationIso,
  vnLocalDateTimeOf,
} from './course-state';

const vn = (local: string) => new Date(`${local}:00+07:00`).getTime();
const timed = { startDate: '2026-12-10', endDate: '2026-12-12', startTime: '08:00', endTime: '17:30' };

describe('khóa có giờ bắt đầu / kết thúc', () => {
  it('trạng thái tổ chức tính theo giờ', () => {
    expect(organizingState(timed, vn('2026-12-10T07:59'))).toBe('UPCOMING');
    expect(organizingState(timed, vn('2026-12-10T08:00'))).toBe('ONGOING');
    expect(organizingState(timed, vn('2026-12-12T17:30'))).toBe('ONGOING');
    expect(organizingState(timed, vn('2026-12-12T17:31'))).toBe('ENDED');
    expect(isCourseEnded(timed, vn('2026-12-12T17:31'))).toBe(true);
  });

  it('khóa cũ chưa có giờ vẫn tính cả ngày', () => {
    const legacy = { startDate: '2026-12-10', endDate: '2026-12-12' };
    expect(organizingState(legacy, vn('2026-12-10T00:00'))).toBe('ONGOING');
    expect(organizingState(legacy, vn('2026-12-12T23:59'))).toBe('ONGOING');
    expect(organizingState(legacy, vn('2026-12-13T00:00'))).toBe('ENDED');
  });

  it('hiển thị giờ kèm ngày; khóa quá khứ chỉ hiện ngày', () => {
    expect(formatCoursePeriod(timed)).toBe('08:00 10/12/2026 – 17:30 12/12/2026');
    expect(formatCoursePeriod({ ...timed, pastCourse: true })).toBe('10/12/2026 – 12/12/2026');
    expect(formatCoursePeriod({})).toBe('');
  });
});

describe('ngày giờ đăng ký (giờ Việt Nam)', () => {
  it('đổi mốc ISO sang ngày giờ Việt Nam và ngược lại', () => {
    expect(vnLocalDateTimeOf('2027-01-01T01:00:00Z')).toBe('2027-01-01T08:00');
    expect(vnLocalDateTimeOf('2027-02-28T10:30:00+07:00')).toBe('2027-02-28T10:30');
    expect(vnLocalDateTimeOf('')).toBe('');
    expect(registrationIso('2027-01-01T08:00')).toBe('2027-01-01T08:00:00+07:00');
  });
});
