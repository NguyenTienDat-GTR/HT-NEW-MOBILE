import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/shared/theme/theme-provider';

import type { ScanPerson } from '../domain/attendance-scan';
import {
  FeePaymentQueue,
  type FeeQueueOptions,
  type FeeSaveResult,
} from '../domain/fee-payment-queue';

import { ScanFee } from './AttendanceScanScreen';
import { FeeCheckRow } from './FeeCheckRow';
import { MoneyField } from './MoneyField';

// RNTL 14: render, fireEvent và rerender đều bất đồng bộ.
const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('MoneyField', () => {
  const props = { values: {}, locked: false, label: 'Lệ phí mỗi người' };

  it('hiện số tiền có dấu chấm hàng nghìn và đọc bằng chữ', async () => {
    await wrap(<MoneyField {...props} value="150000" onChange={() => undefined} />);
    expect(screen.getByDisplayValue('150.000')).toBeTruthy();
    expect(screen.getByText('Một trăm năm mươi nghìn đồng')).toBeTruthy();
    expect(screen.getByText(/Bằng chữ/)).toBeTruthy();
  });

  it('gõ hoặc dán chỉ giữ chữ số và báo giá trị chuỗi chữ số', async () => {
    const onChange = jest.fn();
    await wrap(<MoneyField {...props} value="" onChange={onChange} />);
    const input = screen.getByLabelText('Lệ phí mỗi người');
    await fireEvent.changeText(input, '1.200.000');
    expect(onChange).toHaveBeenLastCalledWith('1200000');
    await fireEvent.changeText(input, 'abc0012x5.000 ₫');
    expect(onChange).toHaveBeenLastCalledWith('125000');
    await fireEvent.changeText(input, '');
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('ô trống không hiện dòng bằng chữ', async () => {
    await wrap(<MoneyField {...props} value="" onChange={() => undefined} />);
    expect(screen.queryByText(/Bằng chữ/)).toBeNull();
  });

  it('khóa lệ phí thì ô không sửa được', async () => {
    await wrap(<MoneyField {...props} locked value="2005000" onChange={() => undefined} />);
    expect(screen.getByDisplayValue('2.005.000').props.editable).toBe(false);
    expect(screen.getByText('Hai triệu không trăm lẻ năm nghìn đồng')).toBeTruthy();
  });
});

describe('FeeCheckRow', () => {
  it('hiện trạng thái, đọc đủ ngữ cảnh và báo giá trị mới khi chạm', async () => {
    const onChange = jest.fn();
    const view = await wrap(<FeeCheckRow person="Nguyễn An" checked={false} onChange={onChange} />);
    const row = screen.getByRole('checkbox', { name: 'Đã đóng lệ phí: Nguyễn An' });
    expect(row.props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByText('Đã đóng tiền')).toBeTruthy();
    await fireEvent.press(row);
    expect(onChange).toHaveBeenCalledWith(true);

    await view.rerender(
      <ThemeProvider>
        <FeeCheckRow person="Nguyễn An" checked onChange={onChange} />
      </ThemeProvider>,
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Đã đóng lệ phí: Nguyễn An' }));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it('đang chờ lưu thì báo bận nhưng vẫn chạm được (đổi ý chỉ gửi trạng thái cuối)', async () => {
    const onChange = jest.fn();
    await wrap(<FeeCheckRow person="Trần Bình" checked busy onChange={onChange} />);
    const row = screen.getByRole('checkbox', { name: 'Đã đóng lệ phí: Trần Bình' });
    expect(row.props.accessibilityState).toMatchObject({ checked: true, busy: true });
    await fireEvent.press(row);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('ScanFee (màn quét)', () => {
  const person = (extra: Partial<ScanPerson> = {}): ScanPerson => ({
    status: 'READY',
    participationId: 'p1',
    courseCode: 'KH-1',
    courseName: 'Khóa 1',
    holyName: 'Giuse',
    fullName: 'Nguyễn An',
    parishName: 'Bà Lụa',
    deaneryName: null,
    teamName: 'Đội 1',
    checkedInAt: null,
    feeEnabled: true,
    feeAmount: 150000,
    feePaidAt: null,
    fetchedAt: 1000,
    ...extra,
  });
  const queueWith = (save: FeeQueueOptions['save']) =>
    new FeePaymentQueue({ save, sleep: async () => undefined });
  const ok = (paid: boolean): FeeSaveResult => ({ paid, paidAt: paid ? '2026-11-18T01:00:00Z' : null });

  it('hiện số tiền và nút Đã đóng tiền; chạm là lưu trạng thái đích với khóa lấy từ kết quả quét', async () => {
    const save = jest.fn(async (_id: string, paid: boolean) => ok(paid));
    const queue = queueWith(save);
    await wrap(<ScanFee person={person({ courseCode: 'KH-9' })} queue={queue} />);
    expect(screen.getByText('150.000 ₫')).toBeTruthy();
    const button = screen.getByRole('checkbox', { name: 'Đã đóng tiền: Giuse Nguyễn An' });
    expect(button.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(button);
    expect(save).toHaveBeenCalledWith('p1', true, 'KH-9');
    queue.dispose();
  });

  it('người đã đóng từ trước hiện sẵn trạng thái đã đóng; chạm để bỏ', async () => {
    const save = jest.fn(async (_id: string, paid: boolean) => ok(paid));
    const queue = queueWith(save);
    await wrap(<ScanFee person={person({ feePaidAt: '2026-11-17T01:00:00Z' })} queue={queue} />);
    const button = screen.getByRole('checkbox', { name: 'Đã đóng tiền: Giuse Nguyễn An' });
    expect(button.props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(button);
    expect(save).toHaveBeenCalledWith('p1', false, 'KH-1');
    queue.dispose();
  });

  it('khóa không thu lệ phí hoặc thiếu mã khóa thì không có phần lệ phí', async () => {
    const queue = queueWith(async () => ok(true));
    const view = await wrap(<ScanFee person={person({ feeEnabled: false })} queue={queue} />);
    expect(screen.queryByText('Lệ phí')).toBeNull();
    await view.rerender(
      <ThemeProvider>
        <ScanFee person={person({ courseCode: '' })} queue={queue} />
      </ThemeProvider>,
    );
    expect(screen.queryByText('Lệ phí')).toBeNull();
    queue.dispose();
  });
});
