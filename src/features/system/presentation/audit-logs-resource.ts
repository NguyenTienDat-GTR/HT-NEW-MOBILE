import { formatDateTime } from '@/core/domain/date-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { joinParts, text } from '@/shared/resource/row';
import type { ResourceDefinition } from '@/shared/resource/types';

import {
  AUDIT_OPERATION_LABELS,
  AUDIT_RESOURCE_KEYS,
  AUDIT_STATUS_CODE_OPTIONS,
  AUDIT_UNIT_OPTIONS,
  auditOperationLabel,
  auditOperationTone,
  auditStatusText,
  auditStatusTone,
  auditTargetText,
  taxonomyLabel,
} from '../domain/system-labels';

const code = (row: ResourceRow) => (typeof row.statusCode === 'number' ? row.statusCode : null);

const unitLabel = (value: unknown) =>
  AUDIT_UNIT_OPTIONS.find((option) => option.value === value)?.label ?? '';

const badges = (row: ResourceRow) => {
  const status = code(row);
  return [
    ...(text(row, 'operation')
      ? [
          {
            label: auditOperationLabel(row.operation),
            tone: auditOperationTone(row.operation),
          },
        ]
      : []),
    ...(status === null ? [] : [{ label: auditStatusText(status), tone: auditStatusTone(status) }]),
  ];
};

/** Nhật ký hệ thống: lịch sử thao tác trong 10 ngày gần nhất, chỉ xem. */
export const auditLogsResource: ResourceDefinition = {
  id: 'audit-logs',
  title: 'Nhật ký hệ thống',
  singular: 'Nhật ký',
  endpoint: '/system/audit-logs',
  idField: 'id',
  searchFields: ['resourceName', 'username', 'resourceId'],
  searchPlaceholder: 'Tên đối tượng, tài khoản, mã',
  defaultSort: { by: 'loggedAt', direction: 'DESC' },
  filters: [
    {
      key: 'operation',
      label: 'Thao tác',
      options: Object.entries(AUDIT_OPERATION_LABELS).map(([value, label]) => ({ value, label })),
    },
    {
      key: 'resource',
      label: 'Đối tượng',
      options: AUDIT_RESOURCE_KEYS.map((value) => ({
        value,
        label: taxonomyLabel('resource', value),
      })),
    },
    { key: 'statusCode', label: 'Mã kết quả HTTP', options: AUDIT_STATUS_CODE_OPTIONS },
    { key: 'unitType', label: 'Cấp đơn vị', options: AUDIT_UNIT_OPTIONS },
  ],
  card: (row) => ({
    title: joinParts(
      [auditOperationLabel(row.operation), taxonomyLabel('resource', row.resource)],
      ' · ',
    ),
    subtitle: auditTargetText(row),
    lines: [joinParts([text(row, 'username'), formatDateTime(text(row, 'loggedAt'))])],
    badges: badges(row),
  }),
  detailTitle: (row) =>
    joinParts([auditOperationLabel(row.operation), taxonomyLabel('resource', row.resource)], ' · '),
  detailBadges: badges,
  detail: (row) => {
    const status = code(row);
    return [
      {
        title: 'Thông tin thao tác',
        fields: [
          { label: 'Thời gian', value: formatDateTime(text(row, 'loggedAt')) },
          { label: 'Tài khoản thực hiện', value: text(row, 'username') },
          { label: 'Thao tác', value: auditOperationLabel(row.operation) },
          { label: 'Loại đối tượng', value: taxonomyLabel('resource', row.resource) },
          { label: 'Tên / mã đối tượng', value: auditTargetText(row) },
          { label: 'Phân hệ', value: taxonomyLabel('module', row.module) },
          { label: 'Cấp đơn vị', value: unitLabel(row.unitType) },
        ],
      },
      {
        title: 'Kết quả',
        fields: [
          {
            label: 'Mã phản hồi HTTP',
            value: status === null ? '' : `${status} · ${auditStatusText(status)}`,
          },
          {
            label: 'Thời gian xử lý',
            value: row.durationMs != null ? `${text(row, 'durationMs')} ms` : '',
          },
          { label: 'Nội dung', value: text(row, 'message') },
          { label: 'Thông báo lỗi', value: text(row, 'errorMessage') },
        ],
      },
      {
        title: 'Yêu cầu kỹ thuật',
        collapsed: true,
        fields: [
          { label: 'Phương thức', value: text(row, 'httpMethod') },
          { label: 'Đường dẫn', value: text(row, 'requestPath') },
          { label: 'Bộ lọc yêu cầu', value: text(row, 'queryString') },
          { label: 'Địa chỉ IP', value: text(row, 'ipAddress') },
          { label: 'Thiết bị / trình duyệt', value: text(row, 'userAgent') },
        ],
      },
    ];
  },
  canCreate: () => false,
  canUpdate: () => false,
  canToggle: () => false,
};
