import { hasPermissionPrefix, type PermissionSubject } from '@/core/domain/permissions';

type Maybe = PermissionSubject | null | undefined;
type Row = Record<string, unknown>;

export const canReadCertificates = (u: Maybe) =>
  hasPermissionPrefix(u, 'training.certificate.read.');
export const canApproveCertificates = (u: Maybe) =>
  hasPermissionPrefix(u, 'training.certificate.approve.');
const canRevokeCertificates = (u: Maybe) => hasPermissionPrefix(u, 'training.certificate.revoke.');
const canReissueCertificates = (u: Maybe) =>
  hasPermissionPrefix(u, 'training.certificate.reissue.');

export const isAwaitingApproval = (row: Row) =>
  row.approvalStatus === 'PENDING' || row.approvalStatus === 'SUBMITTED';

/** Khóa đã kết thúc (và không phải khóa quá khứ): không duyệt/từ chối được nữa, chỉ xuất PDF, thu hồi. */
export const isCourseLocked = (row: Row) => row.courseFinished === true && row.coursePast !== true;

/**
 * Các luật hiện nút theo đúng web (resource-table.tsx). BE kiểm tra lại quyền và phạm vi đơn vị; ở đây chỉ để không
 * hiện nút chắc chắn bị từ chối.
 */
export const canApproveRow = (u: Maybe, row: Row) =>
  canApproveCertificates(u) && isAwaitingApproval(row) && !isCourseLocked(row);

export const canRejectRow = canApproveRow;

export const canRevokeRow = (u: Maybe, row: Row) =>
  canRevokeCertificates(u) && row.approvalStatus === 'APPROVED';

/** Chứng nhận thu hồi vì khóa bị vô hiệu hóa chỉ mở lại khi bật lại khóa, không cấp lại riêng lẻ. */
export const canReissueRow = (u: Maybe, row: Row) =>
  canReissueCertificates(u) &&
  row.approvalStatus === 'REVOKED' &&
  row.revocationSource !== 'COURSE_DISABLED';

/** PDF chỉ có cho chứng nhận đã duyệt (đã thu hồi hoặc chưa duyệt thì BE từ chối). */
export const canSharePdf = (u: Maybe, row: Row) =>
  canReadCertificates(u) && row.approvalStatus === 'APPROVED';

/** Duyệt/từ chối hàng loạt: chỉ hồ sơ đang chờ duyệt và khóa chưa kết thúc. */
export const isBulkEligible = (row: Row) => isAwaitingApproval(row) && !isCourseLocked(row);
