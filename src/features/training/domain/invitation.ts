export interface InvitationIssue {
  participationId: string;
  holyName: string | null;
  fullName: string;
  email: string | null;
  reason: string;
}

export interface InvitationResult {
  total: number;
  sent: number;
  skippedAlreadySent: number;
  failed: number;
  includeQr: boolean;
  issues: InvitationIssue[];
}

/** Tác vụ gửi email nền (InvitationModels.JobResponse): PENDING cho tới khi xong. */
export interface InvitationJob {
  jobId: string;
  status: string;
  result: InvitationResult | null;
  error: string | null;
}

/** Thân gửi BE: không gửi `participationIds` = gửi cho mọi tham dự viên của khóa. */
export function buildInvitationBody(options: { includeQr: boolean; resend: boolean }) {
  return { includeQr: options.includeQr, resend: options.resend };
}

export interface InvitationSummary {
  message: string;
  failed: number;
  issues: { key: string; text: string }[];
}

/** Câu tóm tắt kết quả gửi và danh sách hồ sơ không gửi được (kèm lý do). */
export function invitationSummary(job: InvitationJob): InvitationSummary {
  if (job.error || !job.result)
    return { message: job.error ?? 'Không gửi được email.', failed: 1, issues: [] };
  const { total, sent, skippedAlreadySent, failed, issues } = job.result;
  const parts = [`Đã gửi ${sent}/${total} email`];
  if (skippedAlreadySent > 0) parts.push(`${skippedAlreadySent} người đã nhận trước đó`);
  if (failed > 0) parts.push(`${failed} không gửi được`);
  return {
    message: `${parts.join(', ')}.`,
    failed,
    issues: issues.map((issue) => ({
      key: issue.participationId,
      text: `${[issue.holyName, issue.fullName].filter(Boolean).join(' ')}: ${issue.reason}`,
    })),
  };
}
