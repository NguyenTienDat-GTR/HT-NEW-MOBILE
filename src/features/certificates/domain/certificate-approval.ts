export type SignerType = 'COURSE_CHAPLAIN' | 'CHAPLAIN' | 'OTHER';

export interface SignerDraft {
  type: SignerType;
  name: string;
  title: string;
}

export const DEFAULT_SIGNER: SignerDraft = { type: 'COURSE_CHAPLAIN', name: '', title: '' };

export const SIGNER_OPTIONS: readonly { value: SignerType; label: string }[] = [
  { value: 'COURSE_CHAPLAIN', label: 'Cha tuyên úy của đơn vị tổ chức khóa' },
  { value: 'CHAPLAIN', label: 'Linh mục tuyên úy (nhập tên)' },
  { value: 'OTHER', label: 'Người khác' },
];

type Row = Record<string, unknown>;

export interface DecisionNeeds {
  /** Có chứng nhận của khóa quá khứ: người duyệt phải chọn ngày duyệt. */
  approvalDate: boolean;
  /** Có chứng nhận ngoại lệ do người chấm điểm tạo: bắt buộc nhập lý do duyệt. */
  approveReason: boolean;
}

export function decisionNeeds(rows: readonly Row[]): DecisionNeeds {
  return {
    approvalDate: rows.some((row) => row.coursePast === true),
    approveReason: rows.some((row) => row.exceptionRequested === true),
  };
}

/** Ngày hôm nay dạng yyyy-MM-dd theo giờ máy (người duyệt không được chọn ngày tương lai). */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export interface ApproveInput {
  signer: SignerDraft;
  note: string;
  approvalDate: string;
  needs: DecisionNeeds;
  today?: string;
}

/** Thông báo lỗi tiếng Việt, hoặc null nếu đủ điều kiện để duyệt. */
export function validateApprove(input: ApproveInput): string | null {
  const { signer, note, approvalDate, needs } = input;
  if (signer.type !== 'COURSE_CHAPLAIN' && !signer.name.trim()) return 'Nhập tên người ký.';
  if (signer.type === 'OTHER' && !signer.title.trim()) return 'Nhập chức danh người ký.';
  if (needs.approveReason && !note.trim()) return 'Chứng nhận ngoại lệ: bắt buộc nhập lý do duyệt.';
  if (needs.approvalDate) {
    if (!approvalDate) return 'Chọn ngày duyệt cho chứng nhận của khóa quá khứ.';
    if (approvalDate > (input.today ?? todayIso())) return 'Ngày duyệt không được sau hôm nay.';
  }
  return null;
}

export const validateReject = (note: string): string | null =>
  note.trim() ? null : 'Nhập lý do từ chối.';

function signerFields(signer: SignerDraft) {
  return {
    signerType: signer.type,
    signerName: signer.type === 'COURSE_CHAPLAIN' ? '' : signer.name.trim(),
    signerTitle: signer.type === 'OTHER' ? signer.title.trim() : 'Linh mục tuyên úy',
  };
}

/** Thân duyệt một chứng nhận (POST /certificates/{mã}/approve). */
export function buildApproveBody(input: ApproveInput) {
  return {
    approvalReason: input.note.trim() || undefined,
    ...signerFields(input.signer),
    approvalDate: input.needs.approvalDate ? input.approvalDate : undefined,
  };
}

export const buildRejectBody = (note: string) => ({ reason: note.trim() });

/**
 * Số mã chưa có lý do riêng (chế độ "Lý do riêng từng hồ sơ"); 0 nghĩa là đủ.
 */
export function missingReasonCount(
  ids: readonly string[],
  reasons: Readonly<Record<string, string>>,
): number {
  return ids.filter((id) => !(reasons[id] ?? '').trim()).length;
}

/**
 * Thân từ chối hàng loạt: lý do chung được chép cho từng mã; hoặc lý do riêng từng hồ sơ nếu truyền `individual` (như
 * hai chế độ của hộp thoại duyệt trên web).
 */
export function buildBulkRejectBody(
  ids: readonly string[],
  note: string,
  individual?: Readonly<Record<string, string>>,
) {
  if (individual) {
    return {
      ids,
      approved: false,
      reasons: Object.fromEntries(ids.map((id) => [id, (individual[id] ?? '').trim()])),
    };
  }
  const reason = note.trim();
  return {
    ids,
    approved: false,
    reason,
    reasons: Object.fromEntries(ids.map((id) => [id, reason])),
  };
}

/** Thân duyệt hàng loạt: một người ký và (nếu cần) một ngày duyệt áp dụng cho tất cả. */
export function buildBulkApproveBody(ids: readonly string[], input: ApproveInput) {
  return {
    ids,
    approved: true,
    reason: input.note.trim() || undefined,
    ...signerFields(input.signer),
    approvalDate: input.needs.approvalDate ? input.approvalDate : undefined,
  };
}
