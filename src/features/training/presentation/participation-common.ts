import { formatDate, formatDateTime } from '@/core/domain/date-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { loadOptions } from '@/shared/resource/options';
import { flag, joinParts, text } from '@/shared/resource/row';
import type { CardView, DetailSection, ListFilterDef } from '@/shared/resource/types';

import {
  approvalLabel,
  finalResultLabel,
  GENDER_LABELS,
  participationLabel,
} from '../domain/training-labels';

type Badge = NonNullable<CardView['badges']>[number];

export const leaderName = (row: ResourceRow) =>
  joinParts([text(row, 'leaderHolyName'), text(row, 'leaderFullName')], ' ');

/** Tên hồ sơ hiển thị: kèm tên khóa khi danh sách không lọc theo một khóa. */
export const unitOf = (row: ResourceRow) =>
  joinParts([text(row, 'parishName'), text(row, 'deaneryName')]);

const asBadge = (label: ReturnType<typeof approvalLabel>): Badge[] =>
  label ? [{ label: label.label, tone: label.tone }] : [];

/** Điểm hiển thị: ẩn theo cấu hình của khóa (scoreHidden), chưa chấm thì "Chưa có điểm". */
export function scoreText(row: ResourceRow): string {
  if (flag(row, 'scoreHidden')) return 'Không hiển thị';
  const total = row.totalScore;
  if (total === null || total === undefined || total === '') return 'Chưa có điểm';
  const passing = row.passingScore;
  return passing === null || passing === undefined
    ? String(total)
    : `${String(total)} / ${String(passing)}`;
}

export function resultText(row: ResourceRow): string {
  if (row.passed === true) return 'Đạt';
  if (row.passed === false) return 'Chưa đạt';
  return '';
}

export function flagsOf(row: ResourceRow): Badge[] {
  return [
    ...(row.eligible === false ? [{ label: 'Ngoại lệ', tone: 'warning' as const }] : []),
    ...(flag(row, 'offTarget') ? [{ label: 'Ngoài đợt', tone: 'info' as const }] : []),
    ...(flag(row, 'crossDeanery') ? [{ label: 'Liên giáo hạt', tone: 'info' as const }] : []),
  ];
}

/** Thẻ hồ sơ đăng ký / duyệt: tên huynh trưởng, đơn vị, khóa, trạng thái duyệt và nhãn đặc biệt. */
export function registrationCard(row: ResourceRow): CardView {
  return {
    title: leaderName(row),
    subtitle: unitOf(row),
    lines: [text(row, 'courseName')],
    badges: [
      ...asBadge(approvalLabel(row.approvalStatus)),
      ...asBadge(participationLabel(row.participationStatus)),
      ...flagsOf(row),
    ],
  };
}

/** Thẻ hồ sơ tham dự / chấm điểm: thêm điểm và kết quả. */
export function participantCard(row: ResourceRow): CardView {
  const result = finalResultLabel(row.finalResult);
  return {
    title: leaderName(row),
    subtitle: unitOf(row),
    lines: [text(row, 'courseName'), `Điểm: ${scoreText(row)}`],
    badges: [
      ...asBadge(participationLabel(row.participationStatus)),
      ...(resultText(row)
        ? [
            {
              label: resultText(row),
              tone: row.passed === true ? ('success' as const) : ('danger' as const),
            },
          ]
        : []),
      ...(result ? [{ label: result.label, tone: result.tone }] : []),
    ],
  };
}

export function participationDetail(row: ResourceRow): DetailSection[] {
  const components = Array.isArray(row.componentScores)
    ? (row.componentScores as ResourceRow[])
    : [];
  return [
    {
      title: 'Huynh trưởng',
      fields: [
        { label: 'Họ tên', value: leaderName(row) },
        { label: 'Giới tính', value: GENDER_LABELS[text(row, 'leaderGender')] ?? '' },
        { label: 'Giáo xứ / họ / điểm', value: text(row, 'parishName') },
        { label: 'Giáo hạt', value: text(row, 'deaneryName') },
        { label: 'Cấp hiện tại', value: text(row, 'leaderLevel') },
        { label: 'Email', value: text(row, 'leaderEmail') },
        { label: 'Số điện thoại', value: text(row, 'leaderPhone') },
      ],
    },
    {
      title: 'Đăng ký',
      fields: [
        { label: 'Khóa huấn luyện', value: text(row, 'courseName') },
        { label: 'Ngày đăng ký', value: formatDate(text(row, 'registrationDate')) },
        {
          label: 'Trạng thái tham dự',
          value: participationLabel(row.participationStatus)?.label ?? '',
        },
        { label: 'Trạng thái duyệt', value: approvalLabel(row.approvalStatus)?.label ?? '' },
        {
          label: 'Điều kiện',
          value: row.eligible === false ? 'Ngoại lệ' : row.eligible === true ? 'Đủ điều kiện' : '',
        },
        { label: 'Lý do ngoại lệ', value: text(row, 'exceptionReason') },
        { label: 'Lý do gửi ngoài đợt', value: text(row, 'offTargetReason') },
        { label: 'Lý do liên giáo hạt', value: text(row, 'crossDeaneryReason') },
        { label: 'Ghi chú đăng ký', value: text(row, 'registrationNote') },
        { label: 'Nhận xét của người duyệt', value: text(row, 'review') },
        { label: 'Gửi lúc', value: formatDateTime(text(row, 'parishSubmittedAt')) },
        { label: 'Người gửi', value: text(row, 'createdByName') },
      ],
    },
    {
      title: 'Kết quả',
      fields: [
        { label: 'Đội', value: text(row, 'teamName') },
        { label: 'Điểm tổng kết', value: scoreText(row) },
        { label: 'Kết quả', value: resultText(row) },
        { label: 'Kết quả cuối khóa', value: finalResultLabel(row.finalResult)?.label ?? '' },
        { label: 'Nhận xét', value: text(row, 'scoreNote') },
        ...components.map((item) => ({
          label: text(item, 'componentName') || text(item, 'componentCode'),
          value: `${text(item, 'score') || '—'} / ${text(item, 'maxScore')} (hệ số ${text(item, 'coefficient')})`,
        })),
      ],
    },
  ];
}

export const courseFilter: ListFilterDef = {
  key: 'course.courseCode',
  label: 'Khóa huấn luyện',
  options: {
    load: ({ gateway }) =>
      loadOptions(gateway, '/training/courses', { value: 'courseCode', label: 'courseName' }),
  },
};

/** Giáo hạt / giáo xứ của huynh trưởng (danh sách tùy chọn đã được BE giới hạn theo phạm vi tài khoản). */
export const unitFilters: ListFilterDef[] = [
  {
    key: 'leader.parish.deanery.id',
    label: 'Giáo hạt',
    options: {
      load: ({ gateway }) => loadOptions(gateway, '/deaneries', { value: 'id', label: 'name' }),
    },
  },
  {
    key: 'leader.parish.id',
    label: 'Giáo xứ / họ / điểm',
    dependsOn: ['leader.parish.deanery.id'],
    options: {
      dependsOn: ['leader.parish.deanery.id'],
      load: ({ gateway, values }) => {
        const deanery = String(values['leader.parish.deanery.id'] ?? '');
        return loadOptions(
          gateway,
          '/parishes',
          { value: 'id', label: 'name' },
          { filters: deanery ? { 'deanery.id': deanery } : {} },
        );
      },
    },
  },
];

export const PARTICIPATION_SEARCH_FIELDS = [
  'leader.lastName+leader.firstName',
  'leader.holyName',
  'leader.parish.name',
  'leader.parish.deanery.name',
];
