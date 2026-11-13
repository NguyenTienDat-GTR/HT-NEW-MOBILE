/** Một huynh trưởng trong danh sách gửi đăng ký. */
export interface RegistrationEntry {
  id: string;
  name: string;
  unit: string;
  /** Ngoài đợt của khóa giáo phận: bắt buộc lý do riêng. */
  offTarget: boolean;
  /** Lý do ngoại lệ (danh sách ngoại lệ) hoặc lý do ngoài đợt (danh sách đủ điều kiện). */
  reason: string;
}

/** Thông báo lỗi tiếng Việt nếu danh sách chưa hợp lệ; null nếu gửi được. */
export function missingReasons(
  standard: readonly RegistrationEntry[],
  exceptions: readonly RegistrationEntry[],
): string | null {
  if (standard.length === 0 && exceptions.length === 0)
    return 'Cần lập danh sách đăng ký hoặc thêm ít nhất một huynh trưởng ngoại lệ';
  const standardIds = new Set(standard.map((entry) => entry.id));
  if (exceptions.some((entry) => standardIds.has(entry.id)))
    return 'Danh sách đăng ký và danh sách ngoại lệ không được trùng huynh trưởng';
  const noExceptionReason = exceptions.filter((entry) => entry.reason.trim() === '');
  if (noExceptionReason.length)
    return `Hồ sơ ngoại lệ cần lý do: ${noExceptionReason.map((entry) => entry.name).join(', ')}`;
  const noOffTargetReason = standard.filter(
    (entry) => entry.offTarget && entry.reason.trim() === '',
  );
  if (noOffTargetReason.length)
    return `Hồ sơ ngoài đợt cần lý do riêng: ${noOffTargetReason.map((entry) => entry.name).join(', ')}`;
  return null;
}

/**
 * Thân gửi BE (TrainingRegistrationRequest): leaderIds cho danh sách đủ điều kiện, exceptionReasonsByLeaderId cho
 * ngoại lệ, offTargetReasonsByLeaderId cho hồ sơ ngoài đợt.
 */
export function buildRegistrationBody(
  sender: string,
  standard: readonly RegistrationEntry[],
  exceptions: readonly RegistrationEntry[],
) {
  const offTarget = Object.fromEntries(
    [...standard, ...exceptions]
      .filter((entry) => entry.offTarget)
      .map((entry) => [entry.id, entry.reason.trim()]),
  );
  return {
    ...(sender ? { senderType: sender } : {}),
    ...(standard.length ? { leaderIds: standard.map((entry) => entry.id) } : {}),
    ...(exceptions.length
      ? {
          exceptionReasonsByLeaderId: Object.fromEntries(
            exceptions.map((entry) => [entry.id, entry.reason.trim()]),
          ),
        }
      : {}),
    ...(Object.keys(offTarget).length ? { offTargetReasonsByLeaderId: offTarget } : {}),
  };
}
