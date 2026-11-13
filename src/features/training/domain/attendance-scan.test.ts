import {
  attendanceTokenFromScan,
  classifyScan,
  INITIAL_SCAN_FLOW,
  scanFlowReducer,
  shouldProcessScan,
  type ScanFlowState,
  type ScanPerson,
} from './attendance-scan';

const person = (status: ScanPerson['status']): ScanPerson => ({
  status,
  participationId: 'p1',
  courseCode: 'K1',
  courseName: 'Khóa 1',
  holyName: 'Phêrô',
  fullName: 'Nguyễn Văn An',
  parishName: null,
  deaneryName: null,
  teamName: null,
  checkedInAt: null,
});

describe('mã QR điểm danh', () => {
  it('nhận mã đúng dạng, bỏ khoảng trắng và xuống dòng của máy quét', () => {
    expect(attendanceTokenFromScan('HTATT2.K1.P1.sig\n')).toBe('HTATT2.K1.P1.sig');
    expect(attendanceTokenFromScan(' HTATT2.K1.P1.sig ')).toBe('HTATT2.K1.P1.sig');
    expect(attendanceTokenFromScan('HTATT2.K1.P1')).toBeNull();
    expect(attendanceTokenFromScan('HTATT2.K1.P 1.sig')).toBeNull();
  });

  it('phân loại: điểm danh, chứng nhận, bản cũ, lạ', () => {
    expect(classifyScan('HTATT2.K1.P1.sig')).toEqual({
      kind: 'attendance',
      token: 'HTATT2.K1.P1.sig',
    });
    expect(classifyScan('https://clead.io.vn/certificates/CN-001')).toEqual({
      kind: 'certificate',
      code: 'CN-001',
    });
    expect(classifyScan('HTATT1.abc')).toEqual({ kind: 'legacy-attendance' });
    expect(classifyScan('HTATT9.x')).toEqual({ kind: 'unknown' });
    expect(classifyScan('xin chào')).toEqual({ kind: 'unknown' });
  });
});

describe('luồng quét', () => {
  const run = (
    events: Parameters<typeof scanFlowReducer>[1][],
    from: ScanFlowState = INITIAL_SCAN_FLOW,
  ) => events.reduce(scanFlowReducer, from);

  it('quét → tra cứu → xác nhận → điểm danh → quét tiếp', () => {
    const done = run([
      { type: 'scanned', token: 't' },
      { type: 'looked-up', person: person('READY') },
      { type: 'confirm' },
      { type: 'confirmed', person: person('CHECKED_IN') },
    ]);
    expect(done.step).toBe('done');
    expect(run([{ type: 'next' }], done)).toEqual(INITIAL_SCAN_FLOW);
  });

  it('người đã điểm danh thì không cần xác nhận lại', () => {
    expect(
      run([
        { type: 'scanned', token: 't' },
        { type: 'looked-up', person: person('ALREADY_CHECKED_IN') },
      ]).step,
    ).toBe('already');
  });

  it('đang hiển thị kết quả thì bỏ qua mã mới; bỏ qua ở bước xác nhận quay lại quét', () => {
    const confirm = run([
      { type: 'scanned', token: 't' },
      { type: 'looked-up', person: person('READY') },
    ]);
    expect(run([{ type: 'scanned', token: 'khac' }], confirm)).toBe(confirm);
    expect(run([{ type: 'skip' }], confirm)).toEqual(INITIAL_SCAN_FLOW);
  });

  it('lỗi ở bước tra cứu hiện thông báo rồi quét lại được', () => {
    const failed = run([
      { type: 'scanned', token: 't' },
      { type: 'failed', message: 'Mã không hợp lệ' },
    ]);
    expect(failed).toEqual({ step: 'error', message: 'Mã không hợp lệ' });
    expect(run([{ type: 'next' }], failed)).toEqual(INITIAL_SCAN_FLOW);
  });
});

describe('chống quét lặp', () => {
  it('cùng mã trong thời gian chờ thì bỏ qua, mã khác hoặc hết thời gian chờ thì xử lý', () => {
    const last = { token: 'a', at: 1000 };
    expect(shouldProcessScan('a', 2000, last)).toBe(false);
    expect(shouldProcessScan('a', 4000, last)).toBe(true);
    expect(shouldProcessScan('b', 1500, last)).toBe(true);
    expect(shouldProcessScan('', 9000, null)).toBe(false);
    expect(shouldProcessScan('a', 0, null)).toBe(true);
  });
});
