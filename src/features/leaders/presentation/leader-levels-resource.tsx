import type { ResourceDefinition } from '@/shared/resource/types';

import { canCreateLeaderLevel, canUpdateLeaderLevel } from '../domain/leader-permissions';

import { LeaderLevelsScreen } from './LeaderLevelsScreen';

/** Danh mục cấp độ là danh sách ngắn không phân trang nên dùng màn riêng (renderList); các hàm khác chỉ để thỏa kiểu. */
export const leaderLevelsResource: ResourceDefinition = {
  id: 'leader-levels',
  title: 'Cấp độ huynh trưởng',
  singular: 'Cấp độ',
  endpoint: '/leader-levels',
  idField: 'levelCode',
  searchFields: [],
  searchPlaceholder: '',
  card: (row) => ({ title: String(row.levelName ?? '') }),
  detailTitle: (row) => String(row.levelName ?? ''),
  detail: () => [],
  renderList: ({ subject }) => <LeaderLevelsScreen subject={subject} />,
  canCreate: (subject) => canCreateLeaderLevel(subject),
  canUpdate: (subject) => canUpdateLeaderLevel(subject),
  canToggle: () => false,
};
