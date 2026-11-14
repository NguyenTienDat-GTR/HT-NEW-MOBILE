import { text } from '@/shared/resource/row';
import { parseInitialFilters } from '@/shared/resource/initial-filters';
import type { ResourceDefinition } from '@/shared/resource/types';

import { PARTICIPANT_STATUS_OPTIONS, PARTICIPATION_OPTIONS } from '../domain/training-labels';
import {
  canApproveRegistrations,
  canScoreParticipants,
  canSubmitRegistration,
  isOwnPendingSubmission,
  type TrainingSubject,
} from '../domain/training-permissions';

import { ApprovalsScreen } from './ApprovalsScreen';
import { RegistrationNoteEditor } from './RegistrationNoteEditor';
import { RegistrationSubmitScreen } from './RegistrationSubmitScreen';
import { ScoreEntryScreen } from './ScoreEntryScreen';
import {
  courseFilter,
  participantCard,
  PARTICIPATION_SEARCH_FIELDS,
  participationDetail,
  LEVEL_NAMES_CONTEXT,
  registrationCard,
  leaderName,
  unitFilters,
} from './participation-common';

const encode = (row: Record<string, unknown>) => encodeURIComponent(text(row, 'id'));

const APPROVAL_FILTER_OPTIONS = [
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'REJECTED', label: 'Từ chối' },
] as const;

const ELIGIBLE_OPTIONS = [
  { value: 'true', label: 'Đủ điều kiện' },
  { value: 'false', label: 'Ngoại lệ' },
] as const;

const RESULT_OPTIONS = [
  { value: 'COMPLETED', label: 'Đạt' },
  { value: 'UNCOMPLETED', label: 'Không đạt' },
] as const;

const base = {
  singular: 'Hồ sơ',
  searchFields: PARTICIPATION_SEARCH_FIELDS,
  searchPlaceholder: 'Tên huynh trưởng, giáo xứ, giáo hạt',
  detailTitle: leaderName,
  detail: participationDetail,
  detailContext: LEVEL_NAMES_CONTEXT,
} satisfies Partial<ResourceDefinition>;

/** Hồ sơ đăng ký tham dự: danh sách, chi tiết, thu hồi (người gửi, khi chưa duyệt) và gửi đăng ký mới. */
export const registrationsResource: ResourceDefinition = {
  ...base,
  id: 'registrations',
  title: 'Đăng ký tham dự',
  singular: 'Đăng ký',
  createLabel: 'Gửi đăng ký',
  endpoint: '/training/participations',
  filters: [
    courseFilter,
    { key: 'participationStatus', label: 'Trạng thái đăng ký', options: PARTICIPATION_OPTIONS },
    ...unitFilters,
  ],
  card: registrationCard,
  renderDetailExtra: ({ row, subject }) => <RegistrationNoteEditor row={row} subject={subject} />,
  renderForm: ({ params, subject, onSaved }) => (
    <RegistrationSubmitScreen subject={subject} onSaved={onSaved} presetCourse={params.course} />
  ),
  // Mở thẳng form chung thì `id` rỗng; khóa được truyền qua tham số `course` ở route.
  toggle: {
    isActive: () => true,
    label: () => 'Thu hồi đăng ký',
    successMessage: () => 'Đã thu hồi đăng ký',
    confirmMessage: () => 'Thu hồi hồ sơ đăng ký này. Bạn gửi lại được nếu khóa còn mở đăng ký.',
    run: (gateway, row) => gateway.call('DELETE', `/training/registrations/${encode(row)}`),
  },
  canCreate: (subject) => canSubmitRegistration(subject),
  canUpdate: () => false,
  canToggle: (subject, row) =>
    isOwnPendingSubmission(subject as TrainingSubject | null, row) ||
    (canSubmitRegistration(subject) &&
      row.approvalStatus === 'REJECTED' &&
      row.createdBy === (subject as TrainingSubject | null)?.username),
  // Tạo mới chuyển sang màn riêng; `form` rỗng nhưng cần để hiện nút "Thêm".
  form: {
    titleCreate: 'Gửi đăng ký',
    titleEdit: 'Gửi đăng ký',
    sections: [],
    fields: [],
    initialValues: () => ({}),
    toBody: () => ({}),
  },
};

/** Duyệt đăng ký: chọn một hoặc nhiều hồ sơ rồi duyệt/từ chối (màn riêng ApprovalsScreen). */
export const approvalsResource: ResourceDefinition = {
  ...base,
  id: 'approvals',
  title: 'Duyệt đăng ký',
  endpoint: '/training/participations',
  baseFilters: { approvalStatus: ['PENDING', 'SUBMITTED', 'REJECTED'] },
  filters: [
    courseFilter,
    { key: 'approvalStatus', label: 'Trạng thái duyệt', options: APPROVAL_FILTER_OPTIONS },
    { key: 'eligible', label: 'Điều kiện', options: ELIGIBLE_OPTIONS },
    ...unitFilters,
  ],
  card: registrationCard,
  renderDetailExtra: ({ row, subject }) => <RegistrationNoteEditor row={row} subject={subject} />,
  renderList: ({ def, subject, params }) => (
    <ApprovalsScreen
      def={def}
      subject={subject}
      initialFilters={parseInitialFilters(params.filters)}
    />
  ),
  canCreate: () => false,
  canUpdate: () => false,
  canToggle: () => false,
};

/** Danh sách tham dự: hồ sơ đã duyệt của khóa; người duyệt chuyển hồ sơ về "từ chối duyệt" khi cần. */
export const participantsResource: ResourceDefinition = {
  ...base,
  id: 'participants',
  title: 'Danh sách tham dự',
  endpoint: '/training/participants',
  filters: [
    courseFilter,
    {
      key: 'participationStatus',
      label: 'Trạng thái tham dự',
      options: PARTICIPANT_STATUS_OPTIONS,
    },
    ...unitFilters,
  ],
  card: participantCard,
  toggle: {
    isActive: () => true,
    label: () => 'Chuyển về từ chối duyệt',
    successMessage: () => 'Đã chuyển hồ sơ về trạng thái từ chối duyệt',
    confirmMessage: () =>
      'Hồ sơ rời danh sách tham dự và chuyển về trạng thái từ chối duyệt (không bị xóa; duyệt lại được ở màn Duyệt đăng ký). Không áp dụng cho hồ sơ đã có chứng nhận.',
    run: (gateway, row) => gateway.call('DELETE', `/training/participants/${encode(row)}`),
  },
  canCreate: () => false,
  canUpdate: () => false,
  canToggle: (subject, row) => canApproveRegistrations(subject) && row.courseFinished !== true,
};

/** Chấm điểm: danh sách hồ sơ tham dự; chạm một hồ sơ để nhập điểm theo thành phần của khóa. */
export const scoresResource: ResourceDefinition = {
  ...base,
  id: 'scores',
  title: 'Chấm điểm',
  endpoint: '/training/participants',
  filters: [
    courseFilter,
    { key: 'result', label: 'Kết quả', options: RESULT_OPTIONS },
    ...unitFilters,
  ],
  card: participantCard,
  renderDetail: ({ id, subject }) => <ScoreEntryScreen id={id} subject={subject} />,
  canCreate: () => false,
  canUpdate: (subject) => canScoreParticipants(subject),
  canToggle: () => false,
};
