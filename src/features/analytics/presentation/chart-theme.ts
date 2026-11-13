import type { ColorTokens } from '@/shared/theme/tokens';
import {
  BuildingsIcon,
  CalendarCheckIcon,
  CertificateIcon,
  CheckCircleIcon,
  ChartLineUpIcon,
  ClipboardTextIcon,
  ClockIcon,
  GraduationCapIcon,
  HourglassIcon,
  MapPinIcon,
  MedalIcon,
  PercentIcon,
  ProhibitIcon,
  StarIcon,
  TargetIcon,
  UserPlusIcon,
  UsersThreeIcon,
  WarningIcon,
} from '@/shared/ui/icons';

/**
 * Màu theo thực thể (port từ FE colors.ts): cùng một chỉ số luôn cùng màu ở mọi biểu đồ, không đổi theo thứ hạng.
 * Trả về màu từ token viz của theme, không viết mã màu trực tiếp.
 */
type ColorPick = (c: ColorTokens) => string;

const SERIES: Record<string, ColorPick> = {
  registrations: (c) => c.viz[0],
  attended: (c) => c.viz[1],
  passed: (c) => c.viz[2],
  newLeaders: (c) => c.viz[0],
  promotions: (c) => c.viz[1],
  approved: (c) => c.vizGood,
  pending: (c) => c.vizWarning,
  rejected: (c) => c.vizCritical,
  revoked: (c) => c.vizSerious,
  cumulative: (c) => c.viz[6],
};

const STATUS: Record<string, ColorPick> = {
  APPROVED: (c) => c.vizGood,
  PENDING: (c) => c.vizWarning,
  SUBMITTED: (c) => c.vizWarning,
  REJECTED: (c) => c.vizCritical,
  REVOKED: (c) => c.vizSerious,
  NOT_REQUIRED: (c) => c.vizNeutral,
  NAM: (c) => c.viz[0],
  NU: (c) => c.viz[1],
  UNKNOWN: (c) => c.vizNeutral,
  ACTIVE: (c) => c.viz[2],
  INACTIVE: (c) => c.vizNeutral,
  REGISTERED: (c) => c.viz[0],
  ATTENDED: (c) => c.viz[1],
  COMPLETED: (c) => c.viz[2],
  CANCELLED: (c) => c.viz[3],
  LT_1H: (c) => c.vizSequential[0],
  LT_1D: (c) => c.vizSequential[1],
  LT_3D: (c) => c.vizSequential[2],
  LT_7D: (c) => c.vizSequential[3],
  GE_7D: (c) => c.vizSequential[4],
};

export const seriesColor = (key: string, c: ColorTokens): string =>
  (SERIES[key] ?? ((x) => x.viz[0]))(c);

export const statusColor = (key: string, c: ColorTokens): string =>
  (STATUS[key] ?? ((x) => x.vizNeutral))(c);

/** Màu theo thứ tự cho phân nhóm không có màu cố định (loại khóa, cấp bậc). */
export const orderedColor = (index: number, c: ColorTokens, size = 6): string =>
  c.viz[index % size] as string;

/** Màu mặc định của thanh xếp hạng khi không chỉ định: băm khóa -> viz-1..6 để cùng khóa luôn cùng màu. */
export function entityColor(key: string, c: ColorTokens): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return c.viz[hash % 6] as string;
}

/** Dải tuần tự cho nhóm tuổi (6 nhóm: nhóm cuối dùng lại màu đậm nhất, như FE). */
export const ageRamp = (c: ColorTokens): string[] => [...c.vizSequential, c.vizSequential[4]];

type IconComponent = typeof UsersThreeIcon;
export interface KpiVisual {
  icon: IconComponent;
  tone: ColorPick;
}

const VISUALS: Record<string, KpiVisual> = {
  activeLeaders: { icon: UsersThreeIcon, tone: (c) => c.viz[0] },
  totalLeaders: { icon: UsersThreeIcon, tone: (c) => c.viz[0] },
  newLeaders: { icon: UserPlusIcon, tone: (c) => c.viz[2] },
  promotions: { icon: MedalIcon, tone: (c) => c.viz[3] },
  activeRate: { icon: CheckCircleIcon, tone: (c) => c.viz[2] },
  trainedRate: { icon: GraduationCapIcon, tone: (c) => c.viz[6] },
  femaleRate: { icon: PercentIcon, tone: (c) => c.viz[4] },
  averageAge: { icon: ClockIcon, tone: (c) => c.viz[1] },
  youthRate: { icon: ChartLineUpIcon, tone: (c) => c.viz[2] },
  seniorRate: { icon: ChartLineUpIcon, tone: (c) => c.viz[3] },
  totalDeaneries: { icon: BuildingsIcon, tone: (c) => c.viz[0] },
  totalParishes: { icon: MapPinIcon, tone: (c) => c.viz[6] },
  inactiveDeaneries: { icon: ProhibitIcon, tone: (c) => c.viz[7] },
  inactiveParishes: { icon: ProhibitIcon, tone: (c) => c.viz[7] },
  parishesWithoutLeaders: { icon: WarningIcon, tone: (c) => c.viz[3] },
  leadersPerParish: { icon: UsersThreeIcon, tone: (c) => c.viz[1] },
  totalDioceses: { icon: BuildingsIcon, tone: (c) => c.viz[6] },
  totalCourses: { icon: GraduationCapIcon, tone: (c) => c.viz[6] },
  registrations: { icon: ClipboardTextIcon, tone: (c) => c.viz[0] },
  attendanceRate: { icon: CalendarCheckIcon, tone: (c) => c.viz[1] },
  passRate: { icon: TargetIcon, tone: (c) => c.viz[2] },
  cancellationRate: { icon: ProhibitIcon, tone: (c) => c.viz[7] },
  rejectionRate: { icon: ProhibitIcon, tone: (c) => c.viz[7] },
  rejectedRegistrations: { icon: ProhibitIcon, tone: (c) => c.viz[7] },
  certificateRate: { icon: CertificateIcon, tone: (c) => c.viz[3] },
  averageScore: { icon: StarIcon, tone: (c) => c.viz[4] },
  pendingApproval: { icon: HourglassIcon, tone: (c) => c.viz[3] },
  trainedLeaders: { icon: MedalIcon, tone: (c) => c.viz[2] },
  approvedCertificates: { icon: CertificateIcon, tone: (c) => c.viz[2] },
  totalCertificates: { icon: CertificateIcon, tone: (c) => c.viz[0] },
  approved: { icon: CheckCircleIcon, tone: (c) => c.viz[2] },
  pending: { icon: HourglassIcon, tone: (c) => c.viz[3] },
  rejected: { icon: ProhibitIcon, tone: (c) => c.viz[7] },
  revoked: { icon: WarningIcon, tone: (c) => c.viz[1] },
  approvalRate: { icon: CheckCircleIcon, tone: (c) => c.viz[2] },
  conversionRate: { icon: TargetIcon, tone: (c) => c.viz[6] },
  systemSuggestedRate: { icon: StarIcon, tone: (c) => c.viz[0] },
  exceptionRate: { icon: WarningIcon, tone: (c) => c.viz[3] },
  medianApprovalHours: { icon: ClockIcon, tone: (c) => c.viz[1] },
  averageApprovalHours: { icon: ClockIcon, tone: (c) => c.viz[4] },
};

/** Mỗi chỉ số một biểu tượng + màu token: cùng chỉ số luôn cùng màu ở mọi màn hình. */
export function kpiVisual(key: string): KpiVisual {
  return VISUALS[key] ?? { icon: ChartLineUpIcon, tone: (c) => c.viz[0] };
}
