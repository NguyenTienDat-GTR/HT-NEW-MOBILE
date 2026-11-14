import {
  applyChange,
  firstFormError,
  groupFormRows,
  isCompactField,
  isRequired,
  isValidDayMonth,
  optional,
  parseMulti,
  stringifyMulti,
  sectionErrorCounts,
  validateField,
  validateForm,
} from './form-logic';
import { CONSENT_FIELD } from './consent-field';
import type { FormDefinition, FormFieldDef } from './types';

const f = (over: Partial<FormFieldDef> & Pick<FormFieldDef, 'name' | 'kind'>): FormFieldDef => ({
  label: 'Trường',
  ...over,
});

describe('validateField', () => {
  it('bắt buộc: thông báo khác nhau cho ô chọn và ô nhập', () => {
    expect(
      validateField(
        f({ name: 'a', kind: 'text', label: 'Tên giáo xứ', required: true }),
        { a: '  ' },
        'create',
      ),
    ).toBe('Vui lòng nhập tên giáo xứ');
    expect(
      validateField(
        f({ name: 'a', kind: 'select', label: 'Giáo hạt', required: true }),
        { a: '' },
        'create',
      ),
    ).toBe('Vui lòng chọn giáo hạt');
    expect(
      validateField(f({ name: 'a', kind: 'text', required: true }), { a: 'x' }, 'create'),
    ).toBeNull();
  });

  it('email, số điện thoại, ngày-tháng', () => {
    expect(validateField(f({ name: 'e', kind: 'email' }), { e: 'abc' }, 'create')).toBe(
      'Email không hợp lệ',
    );
    expect(validateField(f({ name: 'e', kind: 'email' }), { e: 'a@b.vn' }, 'create')).toBeNull();
    expect(validateField(f({ name: 'p', kind: 'phone' }), { p: '123' }, 'create')).toMatch(
      /10 chữ số/,
    );
    expect(
      validateField(f({ name: 'p', kind: 'phone' }), { p: '0901234567' }, 'create'),
    ).toBeNull();
    expect(validateField(f({ name: 'd', kind: 'daymonth' }), { d: '02-30' }, 'create')).toBe(
      'Ngày và tháng không hợp lệ',
    );
    expect(validateField(f({ name: 'd', kind: 'daymonth' }), { d: '02-29' }, 'create')).toBeNull();
  });

  it('ngày không được sau hôm nay', () => {
    const field = f({ name: 'b', kind: 'date', maxDate: 'today' });
    expect(validateField(field, { b: '2030-01-01' }, 'create', '2026-11-13')).toBe(
      'Ngày không được sau hôm nay',
    );
    expect(validateField(field, { b: '2026-11-13' }, 'create', '2026-11-13')).toBeNull();
  });

  it('trường ẩn không bị kiểm tra; validate riêng chạy sau cùng', () => {
    expect(
      validateField(
        f({ name: 'a', kind: 'text', required: true, visible: () => false }),
        {},
        'create',
      ),
    ).toBeNull();
    const custom = f({
      name: 'a',
      kind: 'text',
      validate: (v) => (v === 'x' ? 'Không được là x' : null),
    });
    expect(validateField(custom, { a: 'x' }, 'create')).toBe('Không được là x');
  });
});

describe('form helpers', () => {
  const form = {
    fields: [
      f({ name: 'deanery', kind: 'select', resets: ['parish'] }),
      f({ name: 'parish', kind: 'select' }),
      f({ name: 'on', kind: 'switch' }),
    ],
  } as unknown as FormDefinition;

  it('applyChange xóa trường phụ thuộc', () => {
    expect(applyChange(form, { deanery: 'D1', parish: 'P1' }, 'deanery', 'D2')).toEqual({
      deanery: 'D2',
      parish: '',
    });
  });

  it('validateForm gom lỗi theo tên trường; optional bỏ chuỗi rỗng', () => {
    const required = {
      fields: [f({ name: 'a', kind: 'text', required: true }), f({ name: 'b', kind: 'text' })],
    } as unknown as FormDefinition;
    expect(validateForm(required, { a: '', b: '' }, 'create')).toEqual({
      a: 'Vui lòng nhập trường',
    });
    expect(optional({ a: '  ' }, 'a')).toBeUndefined();
    expect(optional({ a: ' x ' }, 'a')).toBe('x');
  });

  it('isValidDayMonth', () => {
    expect(isValidDayMonth('12-25')).toBe(true);
    expect(isValidDayMonth('13-01')).toBe(false);
    expect(isValidDayMonth('04-31')).toBe(false);
  });
});

describe('bố cục form: xếp cặp ô ngắn', () => {
  const mk = (name: string, extra: Partial<FormFieldDef> = {}): FormFieldDef => ({
    name,
    label: name,
    kind: 'text',
    ...extra,
  });
  const names = (rows: FormFieldDef[][]) => rows.map((row) => row.map((field) => field.name));

  it('hai ô ngày liền nhau chung một hàng, ô văn bản chiếm cả dòng', () => {
    const rows = groupFormRows([
      mk('ten'),
      mk('batDau', { kind: 'date' }),
      mk('ketThuc', { kind: 'date' }),
      mk('diaDiem'),
    ]);
    expect(names(rows)).toEqual([['ten'], ['batDau', 'ketThuc'], ['diaDiem']]);
  });

  it('ô số cũng là ô ngắn; ô ngắn lẻ không bị bỏ trống nửa hàng', () => {
    const rows = groupFormRows([
      mk('nam', { keyboardType: 'number-pad' }),
      mk('so', { keyboardType: 'decimal-pad' }),
      mk('ngay', { kind: 'date' }),
      mk('ghiChu', { kind: 'multiline' }),
    ]);
    expect(names(rows)).toEqual([['nam', 'so'], ['ngay'], ['ghiChu']]);
  });

  it('khai báo width ghi đè mặc định', () => {
    expect(isCompactField(mk('a', { kind: 'date', width: 'full' }))).toBe(false);
    expect(isCompactField(mk('b', { width: 'half' }))).toBe(true);
    expect(isCompactField(mk('c', { kind: 'switch' }))).toBe(false);
  });
});

describe('lỗi form: tìm ô lỗi đầu tiên', () => {
  const form = {
    titleCreate: 'Tạo',
    titleEdit: 'Sửa',
    sections: [
      { title: 'A', fields: ['a1', 'a2'] },
      { title: 'B', fields: ['b1'] },
    ],
    fields: [],
    initialValues: () => ({}),
    toBody: () => ({}),
  } as unknown as FormDefinition;

  it('chọn ô lỗi đầu tiên theo thứ tự hiển thị, không theo thứ tự lỗi được báo', () => {
    expect(firstFormError(form, { b1: 'x', a2: 'y' })).toEqual({ name: 'a2', sectionIndex: 0 });
    expect(firstFormError(form, { b1: 'x' })).toEqual({ name: 'b1', sectionIndex: 1 });
    expect(firstFormError(form, {})).toBeNull();
  });

  it('đếm số lỗi từng nhóm', () => {
    expect(sectionErrorCounts(form, { a1: 'x', a2: 'y', b1: 'z' })).toEqual([2, 1]);
    expect(sectionErrorCounts(form, {})).toEqual([0, 0]);
  });
});

describe('ô nhiều lựa chọn và bắt buộc theo chế độ', () => {
  it('parseMulti đọc chuỗi JSON mảng, sai dạng thì rỗng', () => {
    expect(parseMulti(stringifyMulti(['a', 'b']))).toEqual(['a', 'b']);
    expect(parseMulti('')).toEqual([]);
    expect(parseMulti('không phải json')).toEqual([]);
    expect(parseMulti('{"a":1}')).toEqual([]);
    expect(parseMulti(true)).toEqual([]);
  });

  it('requiredOnCreateOnly: bắt buộc khi tạo, bỏ trống được khi sửa', () => {
    const field = {
      name: 'phoneNumber',
      label: 'Số điện thoại',
      kind: 'phone' as const,
      required: true,
      requiredOnCreateOnly: true,
    };
    expect(isRequired(field, 'create')).toBe(true);
    expect(isRequired(field, 'edit')).toBe(false);
    expect(validateField(field, { phoneNumber: '' }, 'create')).toBe('Vui lòng nhập số điện thoại');
    expect(validateField(field, { phoneNumber: '' }, 'edit')).toBeNull();
  });

  it('ô đồng ý (consent) là ô đúng/sai: chưa tích thì báo lỗi, không đòi "nhập"', () => {
    expect(validateField(CONSENT_FIELD, {}, 'create')).toBe('Vui lòng xác nhận trước khi lưu');
    expect(validateField(CONSENT_FIELD, { subjectConsentConfirmed: true }, 'create')).toBeNull();
  });
});
