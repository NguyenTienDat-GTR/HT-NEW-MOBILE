import type { ResourceDefinition } from '@/shared/resource/types';

import { canReadCrossDeanery } from '../domain/cross-deanery';

import { CourseAttendanceScreen } from './CourseAttendanceScreen';
import { CourseTeamsScreen } from './CourseTeamsScreen';
import { CrossDeaneryScreen } from './CrossDeaneryScreen';

const never = {
  searchFields: [],
  searchPlaceholder: '',
  card: () => ({ title: '' }),
  detailTitle: () => '',
  detail: () => [],
  canCreate: () => false,
  canUpdate: () => false,
  canToggle: () => false,
} satisfies Partial<ResourceDefinition>;

/** Chia đội của một khóa (mở từ chi tiết khóa: `/res/teams?course=<mã>`); không có trong menu. */
export const teamsResource: ResourceDefinition = {
  ...never,
  id: 'teams',
  title: 'Chia đội',
  singular: 'Đội',
  endpoint: '/training/participants',
  renderList: ({ subject, params }) => (
    <CourseTeamsScreen courseCode={params.course} subject={subject} />
  ),
};

/** Điểm danh, thẻ và email thông tin tham dự của một khóa (`/res/attendance?course=<mã>`); không có trong menu. */
export const attendanceResource: ResourceDefinition = {
  ...never,
  id: 'attendance',
  title: 'Điểm danh và thẻ',
  singular: 'Điểm danh',
  endpoint: '/training/participants',
  renderList: ({ subject, params }) => (
    <CourseAttendanceScreen courseCode={params.course} subject={subject} />
  ),
};

/** Gửi huynh trưởng sang khóa của giáo hạt khác, và quyết định của giáo hạt nhà / giáo hạt tổ chức. */
export const crossDeaneryResource: ResourceDefinition = {
  ...never,
  id: 'cross-deanery',
  title: 'Gửi liên giáo hạt',
  singular: 'Yêu cầu',
  endpoint: '/training/cross-deanery/requests',
  renderList: ({ subject }) =>
    canReadCrossDeanery(subject) ? <CrossDeaneryScreen subject={subject} /> : null,
};
