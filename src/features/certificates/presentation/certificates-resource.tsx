import type { ResourceDefinition } from '@/shared/resource/types';

import { CertificateActions } from './CertificateActions';
import { CertificateApprovalsScreen } from './CertificateApprovalsScreen';
import {
  CERTIFICATE_FILTERS,
  CERTIFICATE_SEARCH_FIELDS,
  certificateBadges,
  certificateCard,
  certificateDetail,
  certificateTitle,
  holderName,
} from './certificate-view';

const base = {
  singular: 'Chứng nhận',
  endpoint: '/certificates',
  idField: 'certificateCode',
  searchFields: CERTIFICATE_SEARCH_FIELDS,
  searchPlaceholder: 'Mã chứng nhận, tên huynh trưởng, khóa',
  card: certificateCard,
  detailTitle: (row) => holderName(row) || certificateTitle(row),
  detailBadges: certificateBadges,
  detail: certificateDetail,
  // Chứng nhận do hệ thống sinh khi hoàn thành khóa; thao tác (duyệt, thu hồi, cấp lại, PDF) nằm ở màn chi tiết.
  renderDetailExtra: ({ row, subject }) => <CertificateActions row={row} subject={subject} />,
  canCreate: () => false,
  canUpdate: () => false,
  canToggle: () => false,
} satisfies Partial<ResourceDefinition>;

/** Danh sách chứng nhận: lọc theo khóa, trạng thái, đơn vị, năm cấp; chạm một thẻ để xem chi tiết và thao tác. */
export const certificatesResource: ResourceDefinition = {
  ...base,
  id: 'certificates',
  title: 'Chứng nhận',
  filters: CERTIFICATE_FILTERS,
};

/** Duyệt chứng nhận: màn riêng chọn nhiều chứng nhận để duyệt/từ chối cùng lúc. */
export const certificateApprovalsResource: ResourceDefinition = {
  ...base,
  id: 'certificate-approvals',
  title: 'Duyệt chứng nhận',
  filters: CERTIFICATE_FILTERS.filter((filter) => filter.key !== 'issueDate:year'),
  renderList: ({ def, subject }) => <CertificateApprovalsScreen def={def} subject={subject} />,
};
