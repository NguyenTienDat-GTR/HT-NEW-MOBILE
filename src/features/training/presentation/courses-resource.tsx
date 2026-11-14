import { formatDate } from '@/core/domain/date-format';
import { fmtNumber } from '@/core/domain/number-format';
import { hasPermissionPrefix } from '@/core/domain/permissions';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { optional, parseMulti, stringifyMulti, trimmed } from '@/shared/resource/form-logic';
import { loadOptions } from '@/shared/resource/options';
import { count, flag, joinParts, text } from '@/shared/resource/row';
import type { ResourceDefinition } from '@/shared/resource/types';

import {
  isCourseEnded,
  ORGANIZING_LABELS,
  ORGANIZING_TONES,
  organizingState,
  REGISTRATION_LABELS,
  REGISTRATION_TONES,
  registrationIso,
  registrationState,
  vnLocalDateTimeOf,
} from '../domain/course-state';
import {
  DEFAULT_SCORE_COMPONENT,
  draftsFromCourse,
  maxFinalScore,
  parseScoreComponents,
  scoreComponentsBody,
  scoreComponentsError,
  stringifyScoreComponents,
} from '../domain/score-components';
import {
  canActOnCourse,
  canCreateCourse,
  canCreatePastCourse,
  managedUnitTypes,
  type TrainingSubject,
} from '../domain/training-permissions';

import {
  buildCopyBody,
  EMPTY_COPY,
  parseCopyState,
  stringifyCopyState,
} from '../domain/copy-participants';

import { managementLevelBadge } from '../domain/training-labels';
import { CopyParticipantsField } from './CopyParticipantsField';
import { CourseDetailScreen } from './CourseDetailScreen';
import { ScoreComponentsEditor } from './ScoreComponentsEditor';

const REGISTRATION_OPTIONS = [
  { value: 'OPEN', label: 'Đang mở đăng ký' },
  { value: 'NOT_STARTED', label: 'Chưa đến giờ đăng ký' },
  { value: 'CLOSED', label: 'Đã đóng hoặc không mở đăng ký' },
  { value: 'ENDED', label: 'Đã hết hạn đăng ký' },
] as const;

const ORGANIZING_OPTIONS = [
  { value: 'UPCOMING', label: 'Sắp diễn ra' },
  { value: 'ONGOING', label: 'Đang diễn ra' },
  { value: 'ENDED', label: 'Đã kết thúc' },
] as const;

/** Năm tổ chức: từ 5 năm trước tới năm sau (lọc theo chính xác một năm). */
const yearOptions = () => {
  const year = new Date().getFullYear();
  return Array.from({ length: 7 }, (_, i) => String(year + 1 - i)).map((value) => ({
    value,
    label: `Năm ${value}`,
  }));
};

/** Danh sách khóa dùng làm bộ lọc cho các màn đăng ký, duyệt, tham dự, chấm điểm. */
export const courseFilterOptions = {
  load: ({ gateway }: { gateway: Parameters<typeof loadOptions>[0] }) =>
    loadOptions(gateway, '/training/courses', { value: 'courseCode', label: 'courseName' }),
};

/** Mảng giá trị chuỗi từ dữ liệu BE (không phải mảng thì rỗng). */
const arrayOfText = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);

/**
 * Giá trị ẩn (không gửi BE) giúp các ô "Đợt của khóa" và "Sao chép danh sách tham dự" biết có hiện hay không, giống luật
 * của web: cấp tài khoản được quản lý, cấp quản lý của khóa đang sửa, quyền duyệt đăng ký.
 */
function courseScopeValues(row: ResourceRow | null, subject: unknown) {
  const types = managedUnitTypes(subject as TrainingSubject | null, 'course');
  const canApprove = hasPermissionPrefix(
    subject as TrainingSubject | null,
    'training.participation.approve.',
  );
  return {
    canDioceseCourse: types.includes('DIOCESE'),
    canDeaneryCourse: types.includes('DEANERY'),
    // Sửa khóa: theo cấp quản lý của khóa; tạo mới chỉ một cấp thì cấp đó, nhiều cấp thì chưa biết (hiện cả hai ô).
    courseLevel: row ? text(row, 'managementUnitType') : types.length === 1 ? types[0]! : '',
    // Sao chép chỉ khi có quyền duyệt đăng ký; khóa đã kết thúc hoặc ngừng hoạt động thì không sao chép được.
    copyAllowed: row
      ? canApprove && organizingState(row) === 'UPCOMING' && row.status !== false
      : canApprove,
  };
}

const showsTargetDeaneries = (values: Record<string, string | boolean>) =>
  values.canDioceseCourse === true && values.courseLevel !== 'DEANERY';
const showsOpenToOthers = (values: Record<string, string | boolean>) =>
  values.canDeaneryCourse === true && values.courseLevel !== 'DIOCESE';

const decimal = /^\d+([.,]\d+)?$/;
const integerText = (value: string | boolean) => (typeof value === 'string' ? value.trim() : '');

function courseBadges(row: Record<string, unknown>) {
  const registration = registrationState(row);
  const organizing = organizingState(row);
  const level = managementLevelBadge(row.managementUnitType);
  return [
    ...(level ? [level] : []),
    ...(flag(row, 'status') ? [] : [{ label: 'Đã vô hiệu hóa', tone: 'warning' as const }]),
    { label: ORGANIZING_LABELS[organizing], tone: ORGANIZING_TONES[organizing] },
    { label: REGISTRATION_LABELS[registration], tone: REGISTRATION_TONES[registration] },
  ];
}

const dateRange = (row: Record<string, unknown>) =>
  [formatDate(text(row, 'startDate')), formatDate(text(row, 'endDate'))]
    .filter(Boolean)
    .join(' – ');

/** Khóa huấn luyện: danh sách thẻ, chi tiết riêng (CourseDetailScreen), tạo/sửa theo form cấu hình. */
export const coursesResource: ResourceDefinition = {
  id: 'courses',
  title: 'Khóa huấn luyện',
  singular: 'Khóa huấn luyện',
  createLabel: 'Tạo khóa',
  endpoint: '/training/courses',
  idField: 'courseCode',
  searchFields: ['courseName', 'location'],
  searchPlaceholder: 'Tên khóa hoặc địa điểm',
  statusFilter: true,
  filters: [
    { key: 'hostYear', label: 'Năm tổ chức', options: yearOptions() },
    {
      key: 'courseType.typeCode',
      label: 'Loại khóa',
      options: {
        load: ({ gateway }) =>
          loadOptions(gateway, '/training/course-types', { value: 'typeCode', label: 'typeName' }),
      },
    },
    { key: 'registrationStatus', label: 'Thời gian đăng ký', options: REGISTRATION_OPTIONS },
    { key: 'organizingStatus', label: 'Thời gian tổ chức', options: ORGANIZING_OPTIONS },
  ],
  card: (row) => ({
    title: text(row, 'courseName'),
    subtitle: joinParts([text(row, 'courseTypeName'), text(row, 'hostYear')]),
    lines: [
      dateRange(row),
      `${fmtNumber(count(row, 'approvedParticipantCount'))} tham dự viên đã duyệt`,
    ],
    badges: courseBadges(row),
  }),
  detailTitle: (row) => text(row, 'courseName'),
  detailBadges: courseBadges,
  detail: () => [],
  renderDetail: ({ def, id, subject, onEdit }) => (
    <CourseDetailScreen def={def} id={id} subject={subject} onEdit={onEdit} />
  ),
  form: {
    titleCreate: 'Tạo khóa huấn luyện',
    titleEdit: 'Chỉnh sửa khóa huấn luyện',
    sections: [
      {
        title: 'Thông tin khóa',
        fields: ['courseName', 'courseTypeCode', 'yearsActive', 'location'],
      },
      {
        title: 'Thời gian tổ chức',
        fields: ['startDate', 'endDate', 'hostYear'],
      },
      {
        title: 'Thời gian đăng ký',
        fields: ['registrationEnabled', 'registrationStartAt', 'registrationEndAt'],
      },
      { title: 'Cấu hình chấm điểm', fields: ['passingScore', 'scoreComponents'] },
      {
        title: 'Duyệt và hiển thị',
        fields: ['autoApproveEligible', 'scoreVisible'],
      },
      {
        title: 'Điểm danh và thẻ tham dự',
        fields: ['attendanceEnabled', 'autoSendInvitation'],
      },
      { title: 'Đợt của khóa', fields: ['targetDeaneryIds', 'openToOtherDeaneries'] },
      { title: 'Sao chép danh sách tham dự', fields: ['copySourceCourseCodes'] },
      { title: 'Người nhận danh sách đăng ký', fields: ['recipientUsernames'] },
      { title: 'Thông tin bổ sung', fields: ['additionalNotes'] },
    ],
    fields: [
      { name: 'courseName', label: 'Tên khóa', kind: 'text', required: true, maxLength: 255 },
      {
        name: 'courseTypeCode',
        label: 'Loại khóa',
        kind: 'select',
        required: true,
        readOnlyWhen: (values, mode) => mode === 'edit' && values.hasParticipations === true,
        hint: 'Khóa đã có hồ sơ tham gia thì không đổi được loại khóa, năm tổ chức, số năm hoạt động và điểm đạt.',
        options: {
          load: async ({ gateway, subject }) => {
            const types = managedUnitTypes(subject as TrainingSubject | null, 'course');
            return loadOptions(
              gateway,
              '/training/course-types',
              { value: 'typeCode', label: 'typeName' },
              {
                status: true,
                filters: types.length === 1 ? { managementUnitType: types[0]! } : {},
              },
            );
          },
        },
      },
      {
        name: 'yearsActive',
        label: 'Số năm hoạt động',
        kind: 'text',
        keyboardType: 'number-pad',
        maxLength: 3,
        readOnlyWhen: (values, mode) => mode === 'edit' && values.hasParticipations === true,
        hint: '0 = không yêu cầu.',
        validate: (value) =>
          integerText(value) !== '' && !/^\d+$/.test(integerText(value))
            ? 'Phải là số nguyên không âm'
            : null,
      },
      { name: 'location', label: 'Địa điểm', kind: 'text', maxLength: 255 },
      { name: 'startDate', label: 'Ngày bắt đầu', kind: 'date', required: true },
      {
        name: 'endDate',
        label: 'Ngày kết thúc',
        kind: 'date',
        required: true,
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
        name: 'hostYear',
        label: 'Năm tổ chức',
        kind: 'text',
        keyboardType: 'number-pad',
        maxLength: 4,
        readOnlyWhen: (values, mode) => mode === 'edit' && values.hasParticipations === true,
        hint: 'Để trống thì lấy năm ngày bắt đầu.',
        validate: (value) => {
          const year = integerText(value);
          if (year === '') return null;
          return /^\d{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= 2200
            ? null
            : 'Năm tổ chức phải từ 1900 đến 2200';
        },
      },
      {
        name: 'registrationEnabled',
        label: 'Mở đăng ký',
        kind: 'switch',
        hint: 'Tắt nếu khóa không nhận đăng ký (chỉ nhập danh sách tham dự trực tiếp).',
      },
      {
        name: 'registrationStartAt',
        label: 'Mở đăng ký (ngày giờ)',
        kind: 'datetime',
        required: true,
        visible: (values) => values.registrationEnabled === true,
        validate: (value, values) =>
          typeof value === 'string' &&
          value !== '' &&
          typeof values.startDate === 'string' &&
          values.startDate !== '' &&
          value.slice(0, 10) > values.startDate
            ? 'Thời gian mở đăng ký không được sau ngày bắt đầu khóa'
            : null,
      },
      {
        name: 'registrationEndAt',
        label: 'Đóng đăng ký (ngày giờ)',
        kind: 'datetime',
        required: true,
        visible: (values) => values.registrationEnabled === true,
        validate: (value, values) => {
          if (typeof value !== 'string' || value === '') return null;
          if (
            typeof values.startDate === 'string' &&
            values.startDate !== '' &&
            value.slice(0, 10) > values.startDate
          )
            return 'Thời gian đóng đăng ký không được sau ngày bắt đầu khóa';
          if (
            typeof values.registrationStartAt === 'string' &&
            values.registrationStartAt !== '' &&
            value < values.registrationStartAt
          )
            return 'Thời gian đóng đăng ký không được trước thời gian mở';
          return null;
        },
      },
      {
        name: 'passingScore',
        label: 'Điểm đạt',
        kind: 'text',
        keyboardType: 'decimal-pad',
        required: true,
        maxLength: 6,
        readOnlyWhen: (values, mode) => mode === 'edit' && values.hasParticipations === true,
        hint: 'Điểm tổng kết tối thiểu để đạt khóa.',
        validate: (value, values) => {
          const raw = integerText(value);
          if (raw === '') return null;
          if (!decimal.test(raw)) return 'Điểm đạt phải là số không âm';
          const max = maxFinalScore(parseScoreComponents(String(values.scoreComponents ?? '')));
          return max !== null && Number(raw.replace(',', '.')) > max
            ? `Điểm đạt không được lớn hơn ${max} (điểm tổng kết tối đa của các thành phần)`
            : null;
        },
      },
      {
        name: 'scoreComponents',
        label: 'Thành phần điểm của khóa',
        kind: 'custom',
        render: (props) => <ScoreComponentsEditor {...props} />,
        validate: (value) => scoreComponentsError(parseScoreComponents(String(value))),
      },
      {
        name: 'autoApproveEligible',
        label: 'Tự động duyệt hồ sơ hợp lệ',
        kind: 'switch',
        hint: 'Bật: hồ sơ đủ điều kiện được duyệt ngay sau khi gửi. Hồ sơ ngoại lệ luôn duyệt thủ công.',
      },
      {
        name: 'scoreVisible',
        label: 'Hiển thị điểm của khóa',
        kind: 'switch',
        hint: 'Bật để giáo xứ và huynh trưởng cũng thấy điểm. Cấp sở hữu khóa và cấp cao hơn luôn xem được.',
      },
      {
        name: 'attendanceEnabled',
        label: 'Bật điểm danh bằng mã QR',
        kind: 'switch',
        hint: 'Mỗi hồ sơ tham dự có mã QR riêng để quét điểm danh.',
      },
      {
        name: 'autoSendInvitation',
        label: 'Tự gửi email thông tin tham dự khi duyệt',
        kind: 'switch',
        hint: 'Hồ sơ được duyệt sẽ nhận email thông tin tham dự (kèm mã QR nếu bật điểm danh).',
      },
      {
        name: 'targetDeaneryIds',
        label: 'Khóa dành cho giáo hạt',
        kind: 'multiselect',
        placeholder: 'Chọn các giáo hạt mà khóa này (một đợt) dành cho',
        hint: 'Bỏ trống nếu khóa mở cho tất cả giáo hạt. Giáo xứ thuộc giáo hạt khác vẫn đăng ký được nhưng phải kèm lí do riêng cho từng hồ sơ và hồ sơ được duyệt thủ công.',
        // Chỉ khóa giáo phận: giáo hạt khác gửi hồ sơ sang khóa giáo hạt qua màn Gửi liên giáo hạt.
        visible: (values) => showsTargetDeaneries(values),
        options: {
          load: ({ gateway }) => loadOptions(gateway, '/deaneries', { value: 'id', label: 'name' }),
        },
      },
      {
        name: 'openToOtherDeaneries',
        label: 'Mở đăng ký cho các giáo hạt khác',
        kind: 'switch',
        hint: 'Khi bật, admin các giáo hạt khác nhận thông báo kèm thông tin khóa. Chỉ giáo xứ của giáo hạt được cho phép mới gửi được hồ sơ liên giáo hạt (giáo hạt nhà vẫn đồng ý từng yêu cầu, rồi giáo hạt bạn duyệt).',
        // Chỉ khóa giáo hạt: admin giáo hạt khác nhận thông báo và quyết định có cho giáo xứ của mình gửi hồ sơ hay không.
        visible: (values) => showsOpenToOthers(values),
      },
      {
        name: 'copySourceCourseCodes',
        label: 'Khóa tiên quyết',
        kind: 'custom',
        visible: (values, mode) =>
          values.copyAllowed === true &&
          (mode === 'edit' || String(values.courseTypeCode ?? '') !== ''),
        render: (props) => <CopyParticipantsField {...props} />,
      },
      {
        name: 'recipientUsernames',
        label: 'Tài khoản nhận danh sách đăng ký',
        kind: 'multiselect',
        placeholder: 'Chọn người nhận danh sách đăng ký',
        hint: 'Chỉ hiển thị tài khoản có quyền duyệt danh sách đăng ký trong phạm vi của bạn. Bỏ trống để gửi cho tất cả tài khoản đủ quyền.',
        options: {
          dependsOn: ['courseTypeCode'],
          load: async ({ gateway, values }) => {
            const courseTypeCode = String(values.courseTypeCode ?? '');
            if (!courseTypeCode) return [];
            const people = await gateway.call<Record<string, unknown>[]>(
              'GET',
              '/training/courses/recipient-candidates',
              { query: { courseTypeCode } },
            );
            return people.map((person) => ({
              value: text(person, 'username'),
              label: joinParts([
                text(person, 'fullName') || text(person, 'username'),
                text(person, 'roleName'),
              ]),
            }));
          },
        },
      },
      { name: 'additionalNotes', label: 'Ghi chú', kind: 'multiline', maxLength: 2000 },
    ],
    initialValues: (row, subject) => ({
      ...courseScopeValues(row, subject),
      targetDeaneryIds: stringifyMulti(arrayOfText(row?.targetDeaneryIds)),
      openToOtherDeaneries: row ? flag(row, 'openToOtherDeaneries') : false,
      copySourceCourseCodes: stringifyCopyState(EMPTY_COPY),
      // Mã khóa đang sửa (ô sao chép dùng để lấy khóa nguồn đúng phạm vi); không gửi BE.
      courseCode: row ? text(row, 'courseCode') : '',
      recipientUsernames: stringifyMulti(arrayOfText(row?.recipientUsernames)),
      courseName: row ? text(row, 'courseName') : '',
      courseTypeCode: row ? text(row, 'courseTypeCode') : '',
      yearsActive: row ? text(row, 'yearsActive') : '0',
      location: row ? text(row, 'location') : '',
      startDate: row ? text(row, 'startDate') : '',
      endDate: row ? text(row, 'endDate') : '',
      hostYear: row ? text(row, 'hostYear') : '',
      registrationEnabled: row ? row.registrationEnabled !== false : true,
      registrationStartAt: row ? vnLocalDateTimeOf(row.registrationStartAt) : '',
      registrationEndAt: row ? vnLocalDateTimeOf(row.registrationEndAt) : '',
      passingScore: row ? text(row, 'passingScore') : '',
      scoreComponents: stringifyScoreComponents(
        row
          ? draftsFromCourse(row.scoreComponents)
          : [{ ...DEFAULT_SCORE_COMPONENT, name: 'Điểm thi' }],
      ),
      autoApproveEligible: row ? flag(row, 'autoApproveEligible') : false,
      scoreVisible: row ? flag(row, 'scoreVisible') : false,
      attendanceEnabled: row ? flag(row, 'attendanceEnabled') : false,
      autoSendInvitation: row ? flag(row, 'autoSendInvitation') : false,
      additionalNotes: row ? text(row, 'additionalNotes') : '',
      // Chỉ để khóa các ô khi khóa đã có hồ sơ; không gửi lên BE.
      hasParticipations: row ? flag(row, 'hasParticipations') : false,
    }),
    toBody: (values, mode) => {
      const startDate = trimmed(values, 'startDate');
      const enabled = values.registrationEnabled === true;
      const hostYear =
        optional(values, 'hostYear') ?? (startDate ? startDate.slice(0, 4) : undefined);
      const body: Record<string, unknown> = {
        courseName: trimmed(values, 'courseName'),
        courseTypeCode: values.courseTypeCode,
        hostYear: hostYear === undefined ? undefined : Number(hostYear),
        yearsActive: Number(optional(values, 'yearsActive') ?? 0),
        location: optional(values, 'location'),
        startDate: startDate || undefined,
        endDate: optional(values, 'endDate'),
        registrationEnabled: enabled,
        registrationStartAt:
          enabled && trimmed(values, 'registrationStartAt')
            ? registrationIso(trimmed(values, 'registrationStartAt'))
            : undefined,
        registrationEndAt:
          enabled && trimmed(values, 'registrationEndAt')
            ? registrationIso(trimmed(values, 'registrationEndAt'))
            : undefined,
        passingScore: Number(trimmed(values, 'passingScore').replace(',', '.')),
        scoreComponents: scoreComponentsBody(parseScoreComponents(String(values.scoreComponents))),
        autoApproveEligible: values.autoApproveEligible === true,
        scoreVisible: values.scoreVisible === true,
        attendanceEnabled: values.attendanceEnabled === true,
        autoSendInvitation: values.autoSendInvitation === true,
        additionalNotes: optional(values, 'additionalNotes'),
      };
      if (mode === 'edit') delete body.courseCode;
      // Người nhận danh sách đăng ký: gửi cả danh sách rỗng để bỏ chọn toàn bộ (như web).
      body.recipientUsernames = parseMulti(values.recipientUsernames);
      // Đợt của khóa: chỉ gửi khi ô đang hiện; BE từ chối giá trị không hợp lệ với cấp quản lý của khóa.
      if (showsTargetDeaneries(values)) body.targetDeaneryIds = parseMulti(values.targetDeaneryIds);
      if (showsOpenToOthers(values))
        body.openToOtherDeaneries = values.openToOtherDeaneries === true;
      // Sao chép danh sách tham dự chỉ gửi khi có chọn khóa nguồn.
      if (values.copyAllowed === true)
        Object.assign(body, buildCopyBody(parseCopyState(values.copySourceCourseCodes)));
      return body;
    },
    successCreate: 'Tạo khóa thành công',
    successEdit: 'Lưu cập nhật thành công',
  },
  toggle: {
    isActive: (row) => flag(row, 'status'),
    label: (row) => (flag(row, 'status') ? 'Vô hiệu hóa khóa' : 'Bật lại khóa'),
    confirmLabel: (row) => (flag(row, 'status') ? 'Vô hiệu hóa khóa' : 'Bật lại khóa'),
    successMessage: (row) =>
      flag(row, 'status') ? 'Đã vô hiệu hóa khóa huấn luyện' : 'Đã bật lại khóa huấn luyện',
    confirmMessage: (row) =>
      flag(row, 'status')
        ? 'Khóa bị vô hiệu hóa chỉ xem được, không nhận đăng ký, duyệt hay chấm điểm; chứng nhận đã duyệt có thể bị thu hồi. Gõ "Xác nhận" để tiếp tục.'
        : 'Bật lại khóa. Gõ "Xác nhận" để tiếp tục.',
    requiresConfirmText: () => true,
    impact: async (gateway, row) => {
      const data = await gateway.call<Record<string, unknown>>(
        'GET',
        `/training/courses/${encodeURIComponent(text(row, 'courseCode'))}/status-impact`,
      );
      return [
        { label: 'Chứng nhận đã duyệt', value: String(data.approvedCertificates ?? 0) },
        { label: 'Chứng nhận khôi phục được', value: String(data.restorableCertificates ?? 0) },
      ];
    },
    run: (gateway, row, input) =>
      gateway.call(
        'PATCH',
        `/training/courses/${encodeURIComponent(text(row, 'courseCode'))}/toggle-status`,
        { body: { confirmationText: input.confirmText, targetStatus: !flag(row, 'status') } },
      ),
  },
  extraCreate: {
    label: 'Tạo khóa quá khứ',
    path: '/res/past-courses/form',
    can: (subject) => canCreatePastCourse(subject),
  },
  canCreate: (subject) => canCreateCourse(subject),
  canUpdate: (subject, row) => canActOnCourse(subject, row, 'update') && !isCourseEnded(row),
  canToggle: (subject, row) => canActOnCourse(subject, row, 'toggle'),
};
