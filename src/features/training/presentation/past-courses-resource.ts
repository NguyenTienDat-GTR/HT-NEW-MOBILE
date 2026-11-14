import { optional, trimmed } from '@/shared/resource/form-logic';
import { loadLevelOptions } from '@/shared/resource/options';
import { flag, text } from '@/shared/resource/row';
import type { ResourceDefinition } from '@/shared/resource/types';

import { canCreatePastCourse } from '../domain/training-permissions';

const encode = encodeURIComponent;

/**
 * Khóa huấn luyện quá khứ (như pastCourseRouteGroup của web): lưu lịch sử khóa đã tổ chức, chỉ cần tên khóa và năm tổ
 * chức, không cần loại khóa hay thời gian đăng ký. App chỉ tạo/sửa khóa rỗng; nhập danh sách tham dự từ Excel làm trên
 * web. Chỉ tài khoản được super-admin cấp quyền `training.course.create_past.*` thấy và dùng. Đọc dữ liệu qua endpoint
 * khóa chung; tạo/sửa gọi endpoint riêng `/training/courses/past`.
 */
export const pastCoursesResource: ResourceDefinition = {
  id: 'past-courses',
  title: 'Khóa huấn luyện quá khứ',
  singular: 'Khóa quá khứ',
  endpoint: '/training/courses',
  idField: 'courseCode',
  searchFields: ['courseName'],
  searchPlaceholder: 'Tên khóa',
  card: (row) => ({ title: text(row, 'courseName'), subtitle: text(row, 'hostYear') }),
  detailTitle: (row) => text(row, 'courseName'),
  detail: () => [],
  form: {
    titleCreate: 'Tạo khóa huấn luyện quá khứ',
    titleEdit: 'Chỉnh sửa khóa huấn luyện quá khứ',
    sections: [
      { title: 'Thông tin khóa', fields: ['courseName', 'hostYear', 'resultingLevel', 'location'] },
      { title: 'Thời gian', fields: ['startDate', 'endDate'] },
      { title: 'Cấu hình chấm điểm', fields: ['passingScore', 'scoreVisible'] },
      { title: 'Thông tin bổ sung', fields: ['additionalNotes'] },
    ],
    fields: [
      { name: 'courseName', label: 'Tên khóa', kind: 'text', required: true, maxLength: 255 },
      {
        name: 'hostYear',
        label: 'Năm tổ chức',
        kind: 'text',
        required: true,
        keyboardType: 'number-pad',
        maxLength: 4,
        readOnlyWhen: (values, mode) => mode === 'edit' && values.hasParticipations === true,
        hint: 'Không được sau năm hiện tại. Khóa đã có danh sách tham dự thì không đổi được năm tổ chức.',
        validate: (value) => {
          const raw = typeof value === 'string' ? value.trim() : '';
          if (!/^\d{4}$/.test(raw)) return 'Năm tổ chức gồm 4 chữ số';
          const year = Number(raw);
          if (year < 1900) return 'Năm tổ chức không được nhỏ hơn 1900';
          if (year > new Date().getFullYear()) return 'Năm tổ chức không được sau năm hiện tại';
          return null;
        },
      },
      {
        name: 'resultingLevel',
        label: 'Cấp độ đạt được',
        kind: 'select',
        readOnlyWhen: (values, mode) => mode === 'edit' && values.hasParticipations === true,
        hint: 'Không bắt buộc. Có cấp độ thì học viên Đạt được chuyển sang duyệt chứng nhận; khi chứng nhận được duyệt, cấp độ được ghi vào lịch sử cấp độ (cấp hiện tại chỉ tăng nếu cấp mới cao hơn).',
        options: { load: ({ gateway }) => loadLevelOptions(gateway) },
      },
      { name: 'location', label: 'Địa điểm', kind: 'text', maxLength: 255 },
      {
        name: 'startDate',
        label: 'Ngày bắt đầu',
        kind: 'date',
        hint: 'Không bắt buộc, có thể bỏ qua thời gian diễn ra.',
      },
      {
        name: 'endDate',
        label: 'Ngày kết thúc',
        kind: 'date',
        validate: (value, values) =>
          typeof value === 'string' &&
          value !== '' &&
          typeof values.startDate === 'string' &&
          values.startDate !== '' &&
          value < values.startDate
            ? 'Ngày kết thúc không được trước ngày bắt đầu'
            : null,
      },
      {
        name: 'passingScore',
        label: 'Điểm đạt',
        kind: 'text',
        keyboardType: 'decimal-pad',
        maxLength: 6,
        readOnlyWhen: (values, mode) => mode === 'edit' && values.hasParticipations === true,
        hint: 'Không bắt buộc (mặc định 0). Kết quả Đạt / Không đạt của từng học viên lấy theo file Excel.',
        validate: (value) =>
          typeof value === 'string' && value.trim() !== '' && !/^\d+([.,]\d+)?$/.test(value.trim())
            ? 'Điểm đạt phải là số không âm'
            : null,
      },
      {
        name: 'scoreVisible',
        label: 'Hiển thị điểm của khóa',
        kind: 'switch',
        hint: 'Cấp sở hữu khóa và cấp cao hơn luôn xem được điểm. Bật để các cấp còn lại (giáo xứ, huynh trưởng) cũng thấy điểm trong chứng nhận và tab kết quả của hồ sơ huynh trưởng.',
      },
      { name: 'additionalNotes', label: 'Ghi chú', kind: 'multiline', maxLength: 2000 },
    ],
    initialValues: (row) => ({
      courseName: row ? text(row, 'courseName') : '',
      hostYear: row ? text(row, 'hostYear') : '',
      resultingLevel: row ? text(row, 'resultingLevel') : '',
      location: row ? text(row, 'location') : '',
      startDate: row ? text(row, 'startDate') : '',
      endDate: row ? text(row, 'endDate') : '',
      passingScore: row ? text(row, 'passingScore') : '0',
      scoreVisible: row ? flag(row, 'scoreVisible') : false,
      additionalNotes: row ? text(row, 'additionalNotes') : '',
      // Chỉ để khóa các ô khi khóa đã có hồ sơ; không gửi lên BE.
      hasParticipations: row ? flag(row, 'hasParticipations') : false,
    }),
    toBody: (values) => ({
      courseName: trimmed(values, 'courseName'),
      hostYear: Number(trimmed(values, 'hostYear')),
      resultingLevel: optional(values, 'resultingLevel'),
      location: optional(values, 'location'),
      startDate: optional(values, 'startDate'),
      endDate: optional(values, 'endDate'),
      passingScore: Number((optional(values, 'passingScore') ?? '0').replace(',', '.')),
      scoreVisible: values.scoreVisible === true,
      additionalNotes: optional(values, 'additionalNotes'),
    }),
    // Tạo/sửa dùng endpoint riêng của khóa quá khứ.
    submit: ({ gateway, mode, row, body }) =>
      mode === 'create'
        ? gateway.call('POST', '/training/courses/past', { body })
        : gateway.call('PUT', `/training/courses/past/${encode(text(row ?? {}, 'courseCode'))}`, {
            body,
          }),
    successCreate: 'Tạo mới thành công',
    successEdit: 'Lưu cập nhật thành công',
  },
  canCreate: (subject) => canCreatePastCourse(subject),
  canUpdate: (subject) => canCreatePastCourse(subject),
  canToggle: () => false,
};
