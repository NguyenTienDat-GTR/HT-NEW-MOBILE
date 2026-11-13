// Toàn bộ chữ hiển thị của analytics (port từ FE/src/modules/analytics/labels.ts): BE chỉ trả key.
import { formatNumber } from '@/core/domain/number-format';

import type { AlertSeverity, Kpi, KpiUnit } from './entities';

export interface KpiMeta {
  label: string;
  /** Giải thích công thức, để người xem biết số được tính thế nào. */
  hint: string;
  /** Tăng là tốt (true), tăng là xấu (false), hay trung tính (undefined). */
  upIsGood?: boolean;
}

export const KPI_META: Record<string, KpiMeta> = {
  activeLeaders: {
    label: 'Huynh trưởng hoạt động',
    hint: 'Huynh trưởng đang hoạt động, thuộc đơn vị đang hiệu lực.',
  },
  totalLeaders: {
    label: 'Huynh trưởng',
    hint: 'Tổng huynh trưởng hiện tại trong phạm vi và bộ lọc.',
  },
  newLeaders: {
    label: 'Hồ sơ mới',
    hint: 'Hồ sơ huynh trưởng được tạo trong kỳ (ngày nhập vào hệ thống).',
    upIsGood: true,
  },
  promotions: {
    label: 'Thăng cấp',
    hint: 'Lượt thăng cấp trong kỳ, không tính các lượt đã hoàn tác.',
    upIsGood: true,
  },
  activeRate: {
    label: 'Tỷ lệ hoạt động',
    hint: 'Huynh trưởng đang hoạt động / tổng huynh trưởng.',
    upIsGood: true,
  },
  trainedRate: {
    label: 'Đã qua huấn luyện',
    hint: 'Huynh trưởng có ít nhất một khóa đạt / tổng huynh trưởng.',
    upIsGood: true,
  },
  femaleRate: {
    label: 'Tỷ lệ nữ',
    hint: 'Nữ / (nam + nữ) trong số huynh trưởng đã ghi giới tính.',
  },
  averageAge: { label: 'Tuổi trung bình', hint: 'Tuổi trung bình tính theo ngày sinh.' },
  youthRate: { label: 'Dưới 25 tuổi', hint: 'Huynh trưởng dưới 25 tuổi / tổng huynh trưởng.' },
  seniorRate: { label: 'Từ 45 tuổi', hint: 'Huynh trưởng từ 45 tuổi / tổng huynh trưởng.' },
  totalDeaneries: { label: 'Giáo hạt', hint: 'Số giáo hạt trong phạm vi.' },
  inactiveDeaneries: {
    label: 'Giáo hạt ngưng',
    hint: 'Giáo hạt đang bị khóa hoặc thuộc giáo phận bị khóa.',
    upIsGood: false,
  },
  totalParishes: { label: 'Giáo xứ', hint: 'Giáo xứ đang hiệu lực trong phạm vi.' },
  inactiveParishes: {
    label: 'Giáo xứ ngưng',
    hint: 'Giáo xứ bị khóa, hoặc thuộc giáo hạt/giáo phận bị khóa.',
    upIsGood: false,
  },
  parishesWithoutLeaders: {
    label: 'Giáo xứ chưa có HT',
    hint: 'Giáo xứ hiệu lực chưa có huynh trưởng nào đang hoạt động.',
    upIsGood: false,
  },
  leadersPerParish: { label: 'HT mỗi giáo xứ', hint: 'Tổng huynh trưởng / số giáo xứ hiệu lực.' },
  totalDioceses: { label: 'Giáo phận', hint: 'Số giáo phận toàn hệ thống.' },
  totalCourses: {
    label: 'Khóa huấn luyện',
    hint: 'Khóa bắt đầu trong kỳ do phạm vi tổ chức hoặc có hồ sơ của huynh trưởng trong phạm vi.',
  },
  registrations: {
    label: 'Lượt đăng ký',
    hint: 'Hồ sơ đăng ký vào các khóa bắt đầu trong kỳ.',
    upIsGood: true,
  },
  attendanceRate: {
    label: 'Tỷ lệ tham dự',
    hint: 'Tham dự / đăng ký hợp lệ (không tính hồ sơ đã hủy hoặc bị từ chối).',
    upIsGood: true,
  },
  passRate: {
    label: 'Tỷ lệ đạt',
    hint: 'Hồ sơ đạt / hồ sơ đã tham dự, trong các khóa bắt đầu trong kỳ.',
    upIsGood: true,
  },
  cancellationRate: {
    label: 'Tỷ lệ hủy',
    hint: 'Hồ sơ đã hủy / tổng lượt đăng ký.',
    upIsGood: false,
  },
  rejectionRate: {
    label: 'Tỷ lệ từ chối',
    hint: 'Hồ sơ bị từ chối duyệt / tổng lượt đăng ký. Hồ sơ được duyệt lại sẽ không còn tính.',
    upIsGood: false,
  },
  rejectedRegistrations: {
    label: 'Hồ sơ bị từ chối',
    hint: 'Hồ sơ đang ở trạng thái từ chối duyệt, có thể được duyệt lại.',
    upIsGood: false,
  },
  certificateRate: {
    label: 'Đã có chứng nhận',
    hint: 'Hồ sơ đạt đã có chứng nhận được duyệt / hồ sơ đạt.',
    upIsGood: true,
  },
  averageScore: {
    label: 'Điểm trung bình',
    hint: 'Điểm tổng kết trung bình của hồ sơ đã tham dự và có điểm.',
    upIsGood: true,
  },
  pendingApproval: {
    label: 'Chờ duyệt đăng ký',
    hint: 'Hồ sơ đăng ký đang chờ duyệt.',
    upIsGood: false,
  },
  trainedLeaders: {
    label: 'Huynh trưởng đạt',
    hint: 'Số huynh trưởng khác nhau có hồ sơ đạt trong kỳ.',
    upIsGood: true,
  },
  approvedCertificates: {
    label: 'Chứng nhận đã duyệt',
    hint: 'Chứng nhận đã duyệt trong kỳ (theo ngày cấp).',
    upIsGood: true,
  },
  totalCertificates: {
    label: 'Chứng nhận',
    hint: 'Chứng nhận phát sinh trong kỳ (theo ngày cấp, hoặc ngày tạo nếu chưa cấp).',
  },
  approved: { label: 'Đã duyệt', hint: 'Chứng nhận đã duyệt trong kỳ.', upIsGood: true },
  pending: { label: 'Chờ duyệt', hint: 'Chứng nhận đang chờ duyệt.', upIsGood: false },
  rejected: { label: 'Từ chối', hint: 'Chứng nhận bị từ chối.', upIsGood: false },
  revoked: { label: 'Thu hồi', hint: 'Chứng nhận đã duyệt nhưng bị thu hồi.', upIsGood: false },
  approvalRate: {
    label: 'Tỷ lệ duyệt',
    hint: 'Đã duyệt / (đã duyệt + từ chối). Chứng nhận chờ duyệt chưa được tính.',
    upIsGood: true,
  },
  conversionRate: {
    label: 'Tỷ lệ chuyển đổi',
    hint: 'Hồ sơ đạt của khóa bắt đầu trong kỳ đã có chứng nhận được duyệt / hồ sơ đạt.',
    upIsGood: true,
  },
  systemSuggestedRate: {
    label: 'Hệ thống gợi ý',
    hint: 'Chứng nhận do hệ thống gợi ý / tổng chứng nhận.',
  },
  exceptionRate: {
    label: 'Duyệt ngoại lệ',
    hint: 'Chứng nhận duyệt ngoại lệ / chứng nhận đã duyệt.',
    upIsGood: false,
  },
  medianApprovalHours: {
    label: 'Giờ duyệt (trung vị)',
    hint: 'Trung vị thời gian từ lúc tạo đến lúc duyệt.',
    upIsGood: false,
  },
  averageApprovalHours: {
    label: 'Giờ duyệt (TB)',
    hint: 'Trung bình thời gian từ lúc tạo đến lúc duyệt.',
    upIsGood: false,
  },
};

/** Chỉ số ảnh chụp hiện tại: không có kỳ trước để so sánh (cơ cấu nhân sự, số đơn vị). */
export const SNAPSHOT_KPIS: ReadonlySet<string> = new Set([
  'activeLeaders',
  'totalLeaders',
  'activeRate',
  'trainedRate',
  'femaleRate',
  'averageAge',
  'youthRate',
  'seniorRate',
  'totalDeaneries',
  'inactiveDeaneries',
  'totalParishes',
  'inactiveParishes',
  'parishesWithoutLeaders',
  'leadersPerParish',
  'totalDioceses',
]);

export const kpiLabel = (key: string): string => KPI_META[key]?.label ?? key;

export const FUNNEL_LABELS: Record<string, string> = {
  registered: 'Đăng ký',
  valid: 'Hợp lệ',
  attended: 'Tham dự',
  passed: 'Đạt',
  certificate: 'Có chứng nhận',
  approved: 'Chứng nhận đã duyệt',
};

export const TREND_LABELS: Record<string, string> = {
  registrations: 'Đăng ký',
  attended: 'Tham dự',
  passed: 'Đạt',
  newLeaders: 'Hồ sơ mới',
  promotions: 'Thăng cấp',
  total: 'Tổng',
  approved: 'Đã duyệt',
  pending: 'Chờ duyệt',
  rejected: 'Từ chối',
  revoked: 'Thu hồi',
  cumulative: 'Hồ sơ tích lũy',
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Đã duyệt',
  PENDING: 'Chờ duyệt',
  SUBMITTED: 'Đã nộp, chờ duyệt',
  REJECTED: 'Từ chối',
  REVOKED: 'Thu hồi',
  NOT_REQUIRED: 'Không cần duyệt',
  UNKNOWN: 'Chưa rõ',
  REGISTERED: 'Đã đăng ký',
  ATTENDED: 'Đã tham dự',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Tạm ngưng',
  NAM: 'Nam',
  NU: 'Nữ',
  UPCOMING: 'Sắp diễn ra',
  ONGOING: 'Đang diễn ra',
  ENDED: 'Đã kết thúc',
  UNDER_18: 'Dưới 18',
  AGE_18_24: '18–24',
  AGE_25_34: '25–34',
  AGE_35_44: '35–44',
  AGE_45_54: '45–54',
  AGE_55_PLUS: 'Từ 55',
  LT_1H: 'Dưới 1 giờ',
  LT_1D: '1–24 giờ',
  LT_3D: '1–3 ngày',
  LT_7D: '3–7 ngày',
  GE_7D: 'Trên 7 ngày',
};

/** Nhãn của một phần tử phân nhóm: ưu tiên tên thực thể BE trả về, rồi bảng nhãn trạng thái, cuối cùng là chính key. */
export function keyLabel(key: string, label?: string | null): string {
  return label || STATUS_LABELS[key] || key;
}

export const GROUP_BY_OPTIONS: readonly {
  value: string;
  label: string;
  scopes?: readonly string[];
}[] = [
  { value: 'deanery', label: 'Giáo hạt', scopes: ['diocese'] },
  { value: 'parish', label: 'Giáo xứ / giáo họ / giáo điểm', scopes: ['diocese', 'deanery'] },
  { value: 'courseType', label: 'Loại khóa' },
  { value: 'course', label: 'Khóa huấn luyện' },
  { value: 'leaderLevel', label: 'Cấp bậc' },
  { value: 'gender', label: 'Giới tính' },
  { value: 'year', label: 'Năm' },
];

export const GENDER_OPTIONS = [
  { value: 'NAM', label: 'Nam' },
  { value: 'NU', label: 'Nữ' },
] as const;

export const TIME_BUCKET_OPTIONS = [
  { value: 'month', label: 'Tháng' },
  { value: 'quarter', label: 'Quý' },
  { value: 'year', label: 'Năm' },
] as const;

export const SCOPE_NAMES: Record<string, string> = {
  all: 'Toàn hệ thống',
  diocese: 'Giáo phận',
  deanery: 'Giáo hạt',
  parish: 'Giáo xứ',
};

export interface AlertMeta {
  title: string;
  description: (count: number) => string;
  valueSuffix?: string;
}

export const ALERT_META: Record<string, AlertMeta> = {
  slowCertificateApprovals: {
    title: 'Chứng nhận chờ duyệt quá hạn',
    description: (n) => `${n} chứng nhận chờ duyệt quá 7 ngày.`,
    valueSuffix: 'ngày',
  },
  stalePendingApprovals: {
    title: 'Đăng ký chờ duyệt lâu',
    description: (n) => `${n} hồ sơ đăng ký chờ duyệt quá 3 ngày.`,
  },
  scoringOverdue: {
    title: 'Khóa đã kết thúc chưa nhập điểm',
    description: (n) => `${n} hồ sơ đã tham dự chưa có điểm và chưa khóa điểm.`,
  },
  registrationClosingSoon: {
    title: 'Khóa sắp đóng đăng ký',
    description: (n) => `${n} khóa đóng đăng ký trong 7 ngày tới.`,
    valueSuffix: 'ngày nữa',
  },
  lowPassRateCourses: {
    title: 'Khóa có tỷ lệ đạt thấp',
    description: (n) => `${n} khóa đã kết thúc có tỷ lệ đạt dưới 50% (từ 5 người tham dự).`,
    valueSuffix: '%',
  },
  highCancellationCourses: {
    title: 'Khóa có tỷ lệ hủy cao',
    description: (n) => `${n} khóa có trên 20% hồ sơ bị hủy (từ 5 đăng ký).`,
    valueSuffix: '%',
  },
  highRejectionRate: {
    title: 'Tỷ lệ từ chối chứng nhận cao',
    description: (n) => `${n} chứng nhận bị từ chối, vượt 20% số hồ sơ đã xét.`,
    valueSuffix: '%',
  },
  lowActiveRate: {
    title: 'Nhiều huynh trưởng tạm ngưng',
    description: (n) => `${n} huynh trưởng tạm ngưng, tỷ lệ hoạt động dưới 80%.`,
    valueSuffix: '%',
  },
  youthShortage: {
    title: 'Ít huynh trưởng trẻ',
    description: (n) => `Chỉ ${n} huynh trưởng dưới 25 tuổi, dưới 10% tổng số.`,
    valueSuffix: '%',
  },
  genderImbalance: {
    title: 'Lệch cân bằng giới tính',
    description: (n) => `Nhóm giới tính ít hơn chỉ có ${n} người, dưới 30% tổng số.`,
    valueSuffix: '%',
  },
  parishesWithoutLeaders: {
    title: 'Giáo xứ chưa có huynh trưởng',
    description: (n) => `${n} giáo xứ hiệu lực chưa có huynh trưởng đang hoạt động.`,
  },
  inactiveUnits: {
    title: 'Đơn vị ngưng hoạt động',
    description: (n) => `${n} giáo xứ đang bị khóa hoặc thuộc đơn vị bị khóa.`,
  },
};

export const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: 'Cần xử lý ngay',
  warning: 'Cần chú ý',
  info: 'Thông tin',
};

export const WORK_QUEUE_META: Record<string, { title: string; description: string }> = {
  pendingRegistrations: {
    title: 'Đăng ký chờ duyệt',
    description: 'Rà soát hồ sơ theo cấp duyệt hiện tại.',
  },
  rejectedRegistrations: {
    title: 'Hồ sơ bị từ chối',
    description: 'Hồ sơ bị từ chối hoặc bị xóa khỏi danh sách tham dự, có thể duyệt lại.',
  },
  pendingScoring: {
    title: 'Hồ sơ chờ chấm điểm',
    description: 'Nhập điểm cho hồ sơ đã tham dự và chưa khóa điểm.',
  },
  closingCourses: {
    title: 'Khóa sắp đóng đăng ký',
    description: 'Cửa sổ đăng ký kết thúc trong 7 ngày tới.',
  },
  pendingCertificates: {
    title: 'Chứng nhận chờ duyệt',
    description: 'Kiểm tra điểm liệt và lý do ngoại lệ.',
  },
};

export function formatKpiValue(value: number | null | undefined, unit: KpiUnit): string {
  if (value === null || value === undefined) return '—';
  switch (unit) {
    case 'PERCENT':
      return `${formatNumber(value, 1)}%`;
    case 'SCORE':
    case 'HOURS':
      return formatNumber(value, 1);
    default:
      return formatNumber(value, 0);
  }
}

export type DeltaTone = 'good' | 'bad' | 'neutral';

export function deltaTone(delta: number, upIsGood?: boolean): DeltaTone {
  if (delta === 0 || upIsGood === undefined) return 'neutral';
  return delta > 0 === upIsGood ? 'good' : 'bad';
}

/** "+12%", "−3 điểm" so với kỳ trước; null nếu không có số so sánh. */
export function formatDelta(kpi: Pick<Kpi, 'unit' | 'delta' | 'deltaPct'>): string | null {
  const { unit, delta, deltaPct } = kpi;
  if (delta === null) return null;
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  const abs = Math.abs(delta);
  if (unit === 'PERCENT') return `${sign}${formatNumber(abs, 1)} điểm`;
  if (deltaPct !== null) return `${sign}${formatNumber(Math.abs(deltaPct), 1)}%`;
  return `${sign}${formatNumber(abs, 1)}`;
}

/** Chữ nhỏ dưới số: chỉ số ảnh chụp ghi "Hiện tại" hoặc "x / y". */
export function snapshotFootnote(
  kpi: Pick<Kpi, 'key' | 'unit' | 'numerator' | 'denominator'>,
): string | null {
  if (!SNAPSHOT_KPIS.has(kpi.key)) return null;
  if (kpi.unit === 'PERCENT' && kpi.denominator) {
    return `${formatNumber(kpi.numerator ?? 0, 0)} / ${formatNumber(kpi.denominator, 0)}`;
  }
  return 'Hiện tại';
}

/** "Còn 3 ngày", "Còn 5 giờ", "Còn dưới 1 giờ" cho khóa đang mở đăng ký. */
export function deadlineText(hoursLeft: number | null): string {
  if (hoursLeft === null) return 'Không giới hạn hạn đăng ký';
  if (hoursLeft < 1) return 'Còn dưới 1 giờ';
  if (hoursLeft < 24) return `Còn ${hoursLeft} giờ`;
  return `Còn ${Math.floor(hoursLeft / 24)} ngày`;
}
