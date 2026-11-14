import { canUseQrScanner } from './training-permissions';

const user = (permissions: string[], unitLocked = false) => ({
  roles: [],
  permissions,
  unitLocked,
});

describe('canUseQrScanner (như nút quét QR ở header web)', () => {
  it('có quyền quét điểm danh hoặc quyền xem chứng nhận thì dùng được', () => {
    expect(canUseQrScanner(user(['training.attendance.scan.deanery']))).toBe(true);
    expect(canUseQrScanner(user(['training.certificate.read.parish']))).toBe(true);
  });

  it('tài khoản bị khóa đơn vị không quét điểm danh được nhưng vẫn xem chứng nhận', () => {
    expect(canUseQrScanner(user(['training.attendance.scan.deanery'], true))).toBe(false);
    expect(
      canUseQrScanner(
        user(['training.attendance.scan.deanery', 'training.certificate.read.parish'], true),
      ),
    ).toBe(true);
  });

  it('không có quyền liên quan hoặc chưa đăng nhập thì không hiện', () => {
    expect(canUseQrScanner(user(['organization.leader.read.deanery']))).toBe(false);
    expect(canUseQrScanner(null)).toBe(false);
  });
});
