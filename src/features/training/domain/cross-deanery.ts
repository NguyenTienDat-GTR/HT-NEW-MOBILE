import { hasPermission, type PermissionSubject } from '@/core/domain/permissions';

type Maybe = PermissionSubject | null | undefined;

/** Giáo xứ / giáo hạt gửi hồ sơ sang khóa của giáo hạt khác (cùng giáo phận). */
export const canSubmitCrossDeanery = (u: Maybe) =>
  hasPermission(u, 'training.participation.submit.parish') ||
  hasPermission(u, 'training.participation.submit.deanery');
/** Giáo hạt nhà đồng ý cho giáo xứ của mình gửi và duyệt từng yêu cầu. */
export const canApproveCrossDeanery = (u: Maybe) =>
  hasPermission(u, 'training.participation.cross_approve.deanery');
export const canReadCrossDeanery = (u: Maybe) =>
  canSubmitCrossDeanery(u) || canApproveCrossDeanery(u);

export interface CrossCandidate {
  leaderId: string;
  holyName: string | null;
  fullName: string;
  parishName: string | null;
  deaneryName: string | null;
  eligible: boolean;
  /** Khác null = không gửi được (đã có hồ sơ, đang chờ đồng ý, cấp độ vượt mức ngoại lệ…). */
  blockedReason: string | null;
}

export interface ItemDraft {
  reason: string;
  exceptionReason: string;
  note: string;
}

export const EMPTY_DRAFT: ItemDraft = { reason: '', exceptionReason: '', note: '' };

export const candidateName = (c: Pick<CrossCandidate, 'holyName' | 'fullName'>) =>
  [c.holyName, c.fullName].filter(Boolean).join(' ');

/** Người được chọn còn thiếu lý do gửi (mọi hồ sơ) hoặc lý do ngoại lệ (hồ sơ chưa đủ điều kiện). */
export function missingReasons(
  selected: readonly CrossCandidate[],
  drafts: Readonly<Record<string, ItemDraft>>,
): CrossCandidate[] {
  return selected.filter((candidate) => {
    const draft = drafts[candidate.leaderId] ?? EMPTY_DRAFT;
    return !draft.reason.trim() || (!candidate.eligible && !draft.exceptionReason.trim());
  });
}

/** Thân gửi BE (CreateRequest.items): lý do ngoại lệ chỉ gửi cho hồ sơ chưa đủ điều kiện; ghi chú rỗng thì bỏ. */
export function buildItems(
  selected: readonly CrossCandidate[],
  drafts: Readonly<Record<string, ItemDraft>>,
) {
  return selected.map((candidate) => {
    const draft = drafts[candidate.leaderId] ?? EMPTY_DRAFT;
    return {
      leaderId: candidate.leaderId,
      reason: draft.reason.trim(),
      exceptionReason: candidate.eligible ? undefined : draft.exceptionReason.trim(),
      note: draft.note.trim() || undefined,
    };
  });
}

/**
 * Thân quyết định của giáo hạt tổ chức (DecisionRequest): từ chối cả yêu cầu cần ghi chú; đồng ý tất cả thì `itemIds`
 * rỗng; đồng ý một phần thì các hồ sơ còn lại bị từ chối và cần ghi chú.
 */
export function buildDecision(
  approved: boolean,
  note: string,
  selectedIds: readonly string[],
  allIds: readonly string[],
): { body: { approved: boolean; note?: string; itemIds?: string[] }; error: string | null } {
  const trimmed = note.trim();
  if (!approved)
    return trimmed
      ? { body: { approved: false, note: trimmed }, error: null }
      : { body: { approved: false }, error: 'Vui lòng nhập lý do từ chối' };
  if (selectedIds.length === 0)
    return { body: { approved: true }, error: 'Chọn ít nhất một hồ sơ để đồng ý' };
  const partial = selectedIds.length < allIds.length;
  if (partial && !trimmed)
    return { body: { approved: true }, error: 'Có hồ sơ bị từ chối nên cần nhập ghi chú' };
  return {
    body: {
      approved: true,
      note: trimmed || undefined,
      itemIds: partial ? [...selectedIds] : undefined,
    },
    error: null,
  };
}

export const REQUEST_STATUS: Record<
  string,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  PENDING: { label: 'Chờ quyết định', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
  EXPIRED: { label: 'Hết hạn', tone: 'neutral' },
};
