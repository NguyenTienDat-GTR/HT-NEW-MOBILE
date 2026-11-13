import { formatDate, formatDateTime } from '@/core/domain/date-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { loadOptions } from '@/shared/resource/options';
import { flag, joinParts, text } from '@/shared/resource/row';
import type { CardView, DetailSection, ListFilterDef } from '@/shared/resource/types';

import { isAwaitingApproval, isCourseLocked } from '../domain/certificate-permissions';
import {
  CERTIFICATE_STATUS_OPTIONS,
  certificateStatus,
  finalResultText,
  revocationSourceText,
} from '../domain/certificate-labels';

type Badge = NonNullable<CardView['badges']>[number];

export const holderName = (row: ResourceRow) =>
  joinParts([text(row, 'leaderHolyName'), text(row, 'leaderFullName')], ' ');

/** Tên chứng nhận hiển thị: tên chứng nhận, không có thì mã. */
export const certificateTitle = (row: ResourceRow) =>
  text(row, 'certificateName') || text(row, 'certificateCode') || 'Chứng nhận';

/** Điểm: ẩn theo cấu hình của khóa (scoreHidden), chưa chấm thì "Chưa có điểm". */
export function scoreText(row: ResourceRow): string {
  if (flag(row, 'scoreHidden')) return 'Không hiển thị';
  const total = row.totalScore;
  if (total === null || total === undefined || total === '') return 'Chưa có điểm';
  const passing = row.passingScore;
  return passing === null || passing === undefined || passing === ''
    ? String(total)
    : `${String(total)} / ${String(passing)}`;
}

export function certificateBadges(row: ResourceRow): Badge[] {
  const status = certificateStatus(row.approvalStatus);
  return [
    ...(status ? [{ label: status.label, tone: status.tone }] : []),
    ...(flag(row, 'exceptionRequested') ? [{ label: 'Ngoại lệ', tone: 'warning' as const }] : []),
    ...(flag(row, 'coursePast') ? [{ label: 'Khóa quá khứ', tone: 'info' as const }] : []),
    ...(isAwaitingApproval(row) && isCourseLocked(row)
      ? [{ label: 'Khóa đã kết thúc', tone: 'neutral' as const }]
      : []),
  ];
}

/** Thẻ chứng nhận: người nhận, khóa, điểm và trạng thái; phần còn lại ở màn chi tiết. */
export function certificateCard(row: ResourceRow): CardView {
  const issued = formatDate(text(row, 'issueDate'));
  return {
    title: holderName(row) || certificateTitle(row),
    subtitle: joinParts([text(row, 'certificateCode'), issued && `Cấp ${issued}`]),
    lines: [text(row, 'courseName'), `Điểm: ${scoreText(row)}`],
    badges: certificateBadges(row),
  };
}

export function certificateDetail(row: ResourceRow): DetailSection[] {
  const status = row.approvalStatus;
  const revoked = status === 'REVOKED';
  const reissuedAt = text(row, 'reissuedAt');
  const sections: DetailSection[] = [
    {
      title: 'Chứng nhận',
      fields: [
        { label: 'Mã chứng nhận', value: text(row, 'certificateCode') },
        { label: 'Mã cũ', value: text(row, 'oldCertificateCode') },
        { label: 'Tên chứng nhận', value: text(row, 'certificateName') },
        { label: 'Ngày cấp', value: formatDate(text(row, 'issueDate')) },
        { label: 'Trạng thái', value: certificateStatus(status)?.label ?? '' },
        { label: 'Kết quả khóa', value: finalResultText(row.finalResult) },
      ],
    },
    {
      title: 'Huynh trưởng',
      fields: [
        { label: 'Họ tên', value: holderName(row) },
        { label: 'Ngày sinh', value: formatDate(text(row, 'leaderBirthDate')) },
        { label: 'Giáo xứ / họ / điểm', value: text(row, 'leaderParishName') },
        { label: 'Giáo hạt', value: text(row, 'leaderDeaneryName') },
        { label: 'Giáo phận', value: text(row, 'leaderDioceseName') },
      ],
    },
    {
      title: 'Khóa huấn luyện',
      fields: [
        { label: 'Tên khóa', value: text(row, 'courseName') },
        { label: 'Loại khóa', value: text(row, 'courseTypeName') },
        { label: 'Cấp độ khi đạt', value: text(row, 'resultingLevel') },
        { label: 'Năm tổ chức', value: text(row, 'courseHostYear') },
        {
          label: 'Tình trạng khóa',
          value: row.courseFinished === true ? 'Đã kết thúc' : 'Đang diễn ra',
        },
        { label: 'Bắt đầu', value: formatDate(text(row, 'courseStartDate')) },
        { label: 'Kết thúc', value: formatDate(text(row, 'courseEndDate')) },
      ],
    },
    {
      title: 'Kết quả học tập',
      fields: [
        {
          label: 'Tổng điểm',
          value: flag(row, 'scoreHidden') ? 'Không hiển thị' : text(row, 'totalScore'),
        },
        { label: 'Điểm đạt', value: text(row, 'passingScore') },
        {
          label: 'Đánh giá',
          value: flag(row, 'scoreHidden')
            ? ''
            : row.passed === true
              ? 'Đạt'
              : row.passed === false
                ? 'Chưa đạt'
                : '',
        },
        { label: 'Nhận xét', value: text(row, 'scoreNote') },
      ],
    },
    {
      title: 'Phê duyệt và người ký',
      fields: [
        { label: 'Người ký', value: text(row, 'signerName') || text(row, 'signedBy') },
        { label: 'Chức danh người ký', value: text(row, 'signerTitle') },
        { label: 'Người duyệt', value: text(row, 'approvedByName') },
        { label: 'Ngày duyệt', value: formatDateTime(text(row, 'approvedAt')) },
        {
          label: 'Duyệt ngoại lệ',
          value: flag(row, 'approvedByException') ? 'Có (chưa đạt điểm qua)' : '',
        },
        { label: 'Lý do duyệt ngoại lệ', value: text(row, 'exceptionApprovalReason') },
        { label: 'Lý do từ chối', value: text(row, 'rejectionReason') },
      ],
    },
  ];
  if (revoked)
    sections.push({
      title: 'Thu hồi',
      fields: [
        { label: 'Ngày thu hồi', value: formatDateTime(text(row, 'revokedAt')) },
        { label: 'Người thu hồi', value: text(row, 'revokedByName') },
        { label: 'Nguồn thu hồi', value: revocationSourceText(row.revocationSource) },
        { label: 'Lý do thu hồi', value: text(row, 'revocationReason') },
      ],
    });
  else if (reissuedAt)
    sections.push({
      title: 'Cấp lại',
      fields: [
        { label: 'Ngày cấp lại', value: formatDateTime(reissuedAt) },
        { label: 'Người cấp lại', value: text(row, 'reissuedByName') },
        { label: 'Lý do cấp lại', value: text(row, 'reissueReason') },
      ],
    });
  sections.push({
    title: 'Lịch sử ghi nhận',
    collapsed: true,
    fields: [
      { label: 'Người tạo', value: text(row, 'createdByName') },
      { label: 'Ngày tạo', value: formatDateTime(text(row, 'createdAt')) },
      { label: 'Người cập nhật', value: text(row, 'updatedByName') },
      { label: 'Ngày cập nhật', value: formatDateTime(text(row, 'updatedAt')) },
    ],
  });
  return sections;
}

export const CERTIFICATE_SEARCH_FIELDS = [
  'certificateCode',
  'leader.lastName+leader.firstName',
  'leader.firstName+leader.lastName',
  'leader.holyName+leader.lastName+leader.firstName',
  'leader.holyName',
  'course.courseName',
  'course.courseCode',
];

const courseFilter: ListFilterDef = {
  key: 'course.courseCode',
  label: 'Khóa huấn luyện',
  options: {
    load: ({ gateway }) =>
      loadOptions(gateway, '/training/courses', { value: 'courseCode', label: 'courseName' }),
  },
};

/** Năm cấp: chỉ các năm thật sự có chứng nhận trong phạm vi người xem (BE trả [{ year }]). */
const issueYearFilter: ListFilterDef = {
  key: 'issueDate:year',
  label: 'Năm cấp',
  options: {
    load: async ({ gateway }) => {
      const years = await gateway.call<{ year: number }[]>('GET', '/certificates/issue-years');
      return years.map((item) => ({ value: String(item.year), label: String(item.year) }));
    },
  },
};

const unitFilters: ListFilterDef[] = [
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

export const CERTIFICATE_FILTERS: ListFilterDef[] = [
  courseFilter,
  { key: 'approvalStatus', label: 'Trạng thái', options: CERTIFICATE_STATUS_OPTIONS },
  ...unitFilters,
  issueYearFilter,
];
