import { formatDate } from '@/core/domain/date-format';
import { optional, todayIso } from '@/shared/resource/form-logic';
import { flag, joinParts, text } from '@/shared/resource/row';
import type { ResourceDefinition, SelectOption } from '@/shared/resource/types';

import {
  assignmentLevels,
  canCreateAssignment,
  canToggleAssignment,
  unitTypeLabel,
  type UnitSubject,
} from '../domain/executive-board-permissions';

const LEADER_SEARCH_FIELDS = [
  'lastName+firstName',
  'holyName',
  'email',
  'phoneNumber',
  'parish.name',
  'parish.deanery.name',
];

const leaderName = (row: Record<string, unknown>) =>
  joinParts([text(row, 'leaderHolyName'), text(row, 'leaderFullName')], ' ');

const statusBadge = (active: boolean) =>
  active
    ? { label: 'Đang đảm nhiệm', tone: 'success' as const }
    : { label: 'Đã kết thúc', tone: 'neutral' as const };

const period = (row: Record<string, unknown>) =>
  `${formatDate(text(row, 'startDate')) || '—'} → ${formatDate(text(row, 'endDate')) || 'chưa xác định'}`;

export const assignmentsResource: ResourceDefinition = {
  id: 'assignments',
  title: 'Phân công ban điều hành',
  singular: 'Phân công',
  endpoint: '/executive-board/assignments',
  searchFields: ['leader.lastName+leader.firstName', 'leader.holyName', 'position.positionName'],
  searchPlaceholder: 'Huynh trưởng hoặc chức vụ',
  filters: [
    {
      key: 'startDate+endDate:overlapYear',
      label: 'Năm',
      options: {
        load: async ({ gateway }) => {
          const years = await gateway.call<{ year: number; label: string }[]>(
            'GET',
            '/executive-board/assignments/years',
          );
          return years.map((item) => ({ value: String(item.year), label: item.label }));
        },
      },
    },
  ],
  card: (row) => ({
    title: leaderName(row),
    subtitle: text(row, 'positionName'),
    lines: [period(row)],
    badges: [statusBadge(flag(row, 'status'))],
  }),
  detailTitle: leaderName,
  detailBadges: (row) => [statusBadge(flag(row, 'status'))],
  detail: (row) => [
    {
      title: 'Phân công',
      fields: [
        { label: 'Chức vụ', value: text(row, 'positionName') },
        { label: 'Cấp áp dụng', value: unitTypeLabel(text(row, 'unitType')) },
        { label: 'Đơn vị', value: text(row, 'unitName') },
        { label: 'Ngày bắt đầu', value: formatDate(text(row, 'startDate')) },
        { label: 'Ngày kết thúc', value: formatDate(text(row, 'endDate')) },
      ],
    },
    {
      title: 'Huynh trưởng',
      fields: [
        { label: 'Giáo xứ / họ / điểm', value: text(row, 'leaderParishName') },
        { label: 'Giáo hạt', value: text(row, 'leaderDeaneryName') },
      ],
    },
    {
      title: 'Dấu vết ghi nhận',
      collapsed: true,
      fields: [
        { label: 'Tạo bởi', value: text(row, 'createdByName') },
        { label: 'Tạo lúc', value: formatDate(text(row, 'createdAt')) },
        { label: 'Sửa bởi', value: text(row, 'updatedByName') },
        { label: 'Sửa lúc', value: formatDate(text(row, 'updatedAt')) },
      ],
    },
  ],
  form: {
    titleCreate: 'Phân công chức vụ',
    titleEdit: 'Phân công chức vụ',
    sections: [{ fields: ['unitType', 'leaderId', 'positionCode', 'startDate', 'endDate'] }],
    fields: [
      {
        name: 'unitType',
        label: 'Cấp phân công',
        kind: 'select',
        required: true,
        resets: ['positionCode'],
        options: {
          load: async ({ subject }) =>
            assignmentLevels(subject as UnitSubject | null).map((level) => ({
              value: level.unitType,
              label: unitTypeLabel(level.unitType),
            })),
        },
      },
      {
        name: 'leaderId',
        label: 'Huynh trưởng',
        kind: 'lookup',
        required: true,
        lookup: {
          placeholder: 'Gõ tên, email, số điện thoại…',
          search: async (gateway, term) => {
            const page = await gateway.list('/leaders', {
              page: 0,
              size: 20,
              search: term,
              searchFields: LEADER_SEARCH_FIELDS,
              status: true,
            });
            return page.content.map<SelectOption>((row) => ({
              value: text(row, 'id'),
              label: joinParts(
                [
                  joinParts([text(row, 'holyName'), text(row, 'fullName')], ' '),
                  text(row, 'parishName'),
                ],
                ' — ',
              ),
            }));
          },
        },
      },
      {
        name: 'positionCode',
        label: 'Chức vụ',
        kind: 'select',
        required: true,
        hint: 'Chỉ liệt kê chức vụ còn trống.',
        options: {
          dependsOn: ['unitType'],
          load: async ({ gateway, values, subject }) => {
            const level = assignmentLevels(subject as UnitSubject | null).find(
              (item) => item.unitType === values.unitType,
            );
            if (!level?.unitId) return [];
            const seats = await gateway.call<Record<string, unknown>[]>(
              'GET',
              `/executive-board/boards/${level.unitType}/${encodeURIComponent(level.unitId)}`,
            );
            return seats
              .filter((seat) => seat.chaplain !== true && seat.occupied !== true)
              .map((seat) => ({
                value: text(seat, 'positionCode'),
                label: text(seat, 'positionName'),
              }));
          },
        },
      },
      { name: 'startDate', label: 'Ngày bắt đầu', kind: 'date' },
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
            ? 'Ngày kết thúc không được trước ngày bắt đầu.'
            : null,
      },
    ],
    initialValues: (_row, subject) => {
      const levels = assignmentLevels(subject as UnitSubject | null);
      return {
        unitType: levels.length === 1 ? levels[0]!.unitType : '',
        leaderId: '',
        positionCode: '',
        startDate: todayIso(),
        endDate: '',
      };
    },
    toBody: (values, _mode, _row, subject) => {
      const level = assignmentLevels(subject as UnitSubject | null).find(
        (item) => item.unitType === values.unitType,
      );
      return {
        unitType: values.unitType,
        unitId: level?.unitId ?? undefined,
        leaderId: values.leaderId,
        positionCode: values.positionCode,
        startDate: optional(values, 'startDate'),
        endDate: optional(values, 'endDate'),
      };
    },
    successCreate: 'Phân công thành công',
  },
  toggle: {
    isActive: () => true,
    label: () => 'Kết thúc nhiệm kì',
    confirmMessage: () =>
      'Phân công sẽ kết thúc từ hôm nay và không bật lại được (nhiệm kì được giữ lại trong lịch sử). Muốn huynh trưởng giữ chức vụ trở lại, hãy tạo phân công mới.',
    requiresConfirmText: () => true,
    run: (gateway, row, input) =>
      gateway.call(
        'PATCH',
        `/executive-board/assignments/${encodeURIComponent(text(row, 'id'))}/toggle-status`,
        { body: { confirmationText: input.confirmText } },
      ),
  },
  canCreate: (subject) => canCreateAssignment(subject),
  // Không có sửa: đổi người = kết thúc phân công cũ rồi tạo phân công mới.
  canUpdate: () => false,
  canToggle: (subject, row) =>
    canToggleAssignment(subject, text(row, 'unitType'), flag(row, 'status')),
};
