const VN_OFFSET_HOURS = 7;

/** Hạn dùng (yyyy-MM-dd) -> cuối ngày giờ Việt Nam, đúng định dạng thời điểm của BE. */
export function endOfDayIso(date: string): string | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T23:59:59+07:00` : undefined;
}

/** Thời điểm ISO của BE -> ngày theo giờ Việt Nam (yyyy-MM-dd); rỗng nếu không đọc được. */
export function vnDate(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '';
  return new Date(time + VN_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
}

/** Thân gán nhiều vai trò cho một tài khoản (POST /system/account-roles/bulk). Không chọn vai trò chính. */
export function buildBulkAssignBody(input: {
  username: string;
  roleCodes: readonly string[];
  expiresAt: string;
}) {
  return {
    username: input.username.trim(),
    roleCodes: [...input.roleCodes],
    expiresAt: endOfDayIso(input.expiresAt),
  };
}

/** Thân sửa một lần gán (PUT /system/account-roles/{id}): vai trò chính và hạn dùng. BE không cho xóa hạn đã đặt. */
export function buildAssignmentUpdateBody(input: { isPrimary: boolean; expiresAt: string }) {
  return { isPrimary: input.isPrimary, expiresAt: endOfDayIso(input.expiresAt) };
}
