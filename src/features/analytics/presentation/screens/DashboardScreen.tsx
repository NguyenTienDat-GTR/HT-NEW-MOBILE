import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { fmtNumber, fmtPercent } from '@/core/domain/number-format';
import { BarList, type BarItem } from '@/shared/charts/BarList';
import { ChartCard } from '@/shared/charts/ChartCard';
import { DonutChart } from '@/shared/charts/DonutChart';
import { FunnelChart } from '@/shared/charts/FunnelChart';
import { TrendChart } from '@/shared/charts/TrendChart';
import { useTheme } from '@/shared/theme/theme-provider';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

import type { Breakdown, DrillTarget } from '../../domain/entities';
import {
  DEFAULT_FILTERS,
  OVERVIEW_FILTER_VISIBILITY,
  PARISH_OVERVIEW_FILTER_VISIBILITY,
  type AnalyticsFilterState,
} from '../../domain/filters';
import { FUNNEL_LABELS, SCOPE_NAMES, keyLabel } from '../../domain/labels';
import {
  breakdownsOf,
  formatPeriod,
  metricNullable,
  metricNumber,
  toChartRows,
} from '../../domain/selectors';
import { entityColor, orderedColor } from '../chart-theme';
import { statusSegments, toTrendRows, trendSeries } from '../chart-data';
import { AlertsList } from '../components/AlertsList';
import { FilterBar } from '../components/FilterBar';
import { KpiGrid } from '../components/KpiGrid';
import { OpenCoursesList } from '../components/OpenCoursesList';
import { RecordsSheet } from '../components/RecordsSheet';
import { WorkQueueGrid } from '../components/WorkQueueGrid';
import {
  useAnalyticsReport,
  useAnalyticsScopes,
  useFilterOptions,
  useOpenCourses,
  useWorkQueue,
} from '../use-analytics-queries';

const HERO_KPIS = [
  'activeLeaders',
  'newLeaders',
  'registrations',
  'passRate',
  'approvedCertificates',
  'pendingApproval',
];

export interface DashboardScreenProps {
  /** Quyền của tài khoản: quyết định có hiện "Khóa đang mở đăng ký" cho giáo hạt/giáo phận hay không. */
  permissions: readonly string[];
  onOpenPath: (path: string) => void;
  /** Đổi href của BE (đường dẫn web) sang đường dẫn mobile; null = màn đích không có/không đủ quyền (không bấm được). */
  resolveHref: (href: string) => string | null;
  /** Mở màn Phân tích chi tiết. */
  onOpenAnalysis: () => void;
}

/**
 * Tổng quan theo phạm vi tài khoản (như web): toàn hệ thống chỉ có số tổng; giáo xứ có khóa đang mở, nhân sự và cấp bậc;
 * giáo hạt/giáo phận có việc cần xử lý, cảnh báo, xu hướng, phễu huấn luyện. Một cột, kích thước biểu đồ theo bề rộng màn hình.
 */
export function DashboardScreen({
  permissions,
  onOpenPath,
  resolveHref,
  onOpenAnalysis,
}: DashboardScreenProps) {
  const { colors } = useTheme();
  const [filters, setFilters] = useState<AnalyticsFilterState>(DEFAULT_FILTERS);
  const [drill, setDrill] = useState<DrillTarget | null>(null);

  const overview = useAnalyticsReport('overview', filters);
  const report = overview.data;
  const systemWide = report?.scope === 'all';
  const isParish = report?.scope === 'parish';
  const scopes = useAnalyticsScopes();
  const options = useFilterOptions(
    filters.scope || report?.scope || '',
    Boolean(report) && !systemWide,
  );
  const workQueue = useWorkQueue(filters.scope, Boolean(report) && !systemWide && !isParish);
  const registerPermission =
    report?.scope === 'deanery'
      ? 'training.participation.submit.deanery'
      : report?.scope === 'diocese'
        ? 'training.participation.submit.diocese'
        : null;
  const showOpenCourses =
    isParish || (registerPermission !== null && permissions.includes(registerPermission));
  const openCourses = useOpenCourses(filters.scope, showOpenCourses);

  const rows = useMemo(
    () => toTrendRows(toChartRows(report?.trends ?? [], report?.previousTrends ?? [])),
    [report?.trends, report?.previousTrends],
  );
  const busy = overview.isFetching;
  const drillTo = (dimension: string, value: string, label: string) =>
    setDrill({ dataset: 'participations', dimension, value, title: `Hồ sơ đăng ký · ${label}` });

  const bars = (items: Breakdown[]): BarItem[] =>
    items.map((item) => ({
      key: item.key,
      label: keyLabel(item.key, item.label),
      value: metricNumber(item, 'registrations'),
      display: fmtNumber(metricNumber(item, 'registrations')),
      note: `Đạt ${fmtNumber(metricNumber(item, 'passed'))} · Tỷ lệ đạt ${fmtPercent(metricNullable(item, 'passRate'))}`,
      color: entityColor(item.key, colors),
    }));
  const unitItems = report ? breakdownsOf(report, 'unit') : [];

  return (
    <Screen onRefresh={() => void overview.refetch()} refreshing={overview.isRefetching}>
      <View style={{ gap: 4 }}>
        <Text variant="title" accessibilityRole="header">
          Tổng quan
        </Text>
        <Text variant="secondary" tone="muted">
          {report
            ? `Phạm vi: ${SCOPE_NAMES[report.scope] ?? report.scope}`
            : 'Theo dõi hệ thống, việc cần xử lý và điểm cần chú ý.'}
        </Text>
      </View>

      {report && !systemWide ? (
        <FilterBar
          filters={filters}
          onChange={setFilters}
          visible={isParish ? PARISH_OVERVIEW_FILTER_VISIBILITY : OVERVIEW_FILTER_VISIBILITY}
          options={options.data}
          scope={report.scope}
          scopes={scopes.data}
          applied={report.filters}
          busy={busy}
        />
      ) : null}

      {overview.isError && !report ? (
        <>
          <Banner tone="danger" message={errorMessage(overview.error)} />
          <Button label="Thử lại" variant="outline" onPress={() => void overview.refetch()} />
        </>
      ) : !report ? (
        <LoadingState label="Đang tải số liệu…" />
      ) : (
        <>
          <KpiGrid
            report={report}
            keys={systemWide || isParish ? undefined : HERO_KPIS}
            busy={busy}
          />

          {systemWide ? (
            <Banner
              tone="info"
              message="Tài khoản quản trị hệ thống chỉ xem số liệu tổng số. Phân tích chi tiết nằm ở các tài khoản theo giáo phận, giáo hạt hoặc giáo xứ."
            />
          ) : isParish ? (
            <>
              <ChartCard
                title="Khóa đang mở đăng ký"
                description="Khóa của giáo hạt và giáo phận đang nhận đăng ký."
                tone={colors.viz[2]}
              >
                <OpenCoursesList courses={openCourses.data} loading={openCourses.isLoading} />
              </ChartCard>
              <ChartCard
                title="Điểm cần chú ý"
                description="Tự động phát hiện từ dữ liệu của giáo xứ."
                tone={colors.viz[3]}
              >
                <AlertsList alerts={report.alerts} openable={resolveHref} onOpen={onOpenPath} />
              </ChartCard>
              <ChartCard
                busy={busy}
                title="Nhân sự theo kỳ"
                description="Hồ sơ mới và thăng cấp. Đường nét đứt là kỳ liền trước."
                tone={colors.viz[0]}
              >
                <TrendChart
                  ariaLabel="Hồ sơ mới và thăng cấp"
                  rows={rows}
                  series={trendSeries(['newLeaders', 'promotions'], colors)}
                  showPrevious={filters.compare}
                  formatPeriod={formatPeriod}
                />
              </ChartCard>
              <ChartCard
                busy={busy}
                title="Giới tính"
                description="Cơ cấu giới tính hiện tại."
                tone={colors.viz[4]}
              >
                <DonutChart
                  centerLabel="Huynh trưởng"
                  otherColor={colors.vizNeutral}
                  segments={statusSegments(breakdownsOf(report, 'gender'), colors)}
                  onSelect={(segment) =>
                    setDrill({
                      dataset: 'leaders',
                      dimension: 'gender',
                      value: segment.key,
                      title: `Huynh trưởng · ${segment.label}`,
                    })
                  }
                />
              </ChartCard>
              <ChartCard
                busy={busy}
                title="Cấp bậc"
                description="Cấp bậc hiện tại của huynh trưởng."
                tone={colors.viz[6]}
              >
                <BarList
                  defaultColor={colors.viz[6]}
                  items={breakdownsOf(report, 'leaderLevel').map((item) => ({
                    key: item.key,
                    label: keyLabel(item.key, item.label),
                    value: metricNumber(item, 'count'),
                    display: fmtNumber(metricNumber(item, 'count')),
                  }))}
                  onSelect={(bar) =>
                    setDrill({
                      dataset: 'leaders',
                      dimension: 'leaderLevel',
                      value: bar.key,
                      title: `Huynh trưởng · ${bar.label}`,
                    })
                  }
                />
              </ChartCard>
            </>
          ) : (
            <>
              <ChartCard title="Việc cần xử lý" description="Những việc đang chờ bạn.">
                {workQueue.data ? (
                  <WorkQueueGrid
                    items={workQueue.data}
                    openable={resolveHref}
                    onOpen={onOpenPath}
                  />
                ) : (
                  <LoadingState />
                )}
              </ChartCard>
              <ChartCard
                title="Điểm cần chú ý"
                description="Tự động phát hiện từ dữ liệu hiện tại, từ nghiêm trọng tới thông tin."
              >
                <AlertsList alerts={report.alerts} openable={resolveHref} onOpen={onOpenPath} />
              </ChartCard>
              {showOpenCourses ? (
                <ChartCard
                  title="Khóa đang mở đăng ký"
                  description={
                    report.scope === 'diocese'
                      ? 'Khóa của giáo phận đang nhận đăng ký.'
                      : 'Khóa của giáo hạt và giáo phận đang nhận đăng ký.'
                  }
                  tone={colors.viz[2]}
                >
                  <OpenCoursesList courses={openCourses.data} loading={openCourses.isLoading} />
                </ChartCard>
              ) : null}
              <ChartCard
                busy={busy}
                title="Hoạt động huấn luyện theo kỳ"
                description="Theo ngày bắt đầu khóa. Đường nét đứt là kỳ liền trước cùng độ dài."
              >
                <TrendChart
                  ariaLabel="Xu hướng đăng ký, tham dự, đạt"
                  rows={rows}
                  series={trendSeries(['registrations', 'attended', 'passed'], colors)}
                  showPrevious={filters.compare}
                  formatPeriod={formatPeriod}
                />
              </ChartCard>
              <ChartCard
                busy={busy}
                title="Phễu huấn luyện"
                description="Hồ sơ đi qua từng bước. Chạm để xem danh sách."
              >
                {report.funnel.length > 0 ? (
                  <FunnelChart
                    steps={report.funnel.map((step) => ({
                      key: step.key,
                      label: FUNNEL_LABELS[step.key] ?? step.key,
                      count: step.count,
                      rateOfPrevious: step.rateOfPrevious,
                    }))}
                    onSelect={(step) => drillTo('funnel', step.key, step.label)}
                  />
                ) : (
                  <Text variant="secondary" tone="muted">
                    Chưa có dữ liệu
                  </Text>
                )}
              </ChartCard>
              <ChartCard
                busy={busy}
                title="Khóa nổi bật"
                description="Khóa có nhiều lượt đăng ký nhất trong kỳ."
              >
                <BarList
                  defaultColor={colors.viz[0]}
                  limit={5}
                  items={bars(breakdownsOf(report, 'course'))}
                  onSelect={(bar) => drillTo('course', bar.key, bar.label)}
                />
              </ChartCard>
              {unitItems.length > 0 ? (
                <ChartCard
                  busy={busy}
                  title={
                    report.scope === 'diocese'
                      ? 'Giáo hạt tham gia nhiều'
                      : 'Giáo xứ tham gia nhiều'
                  }
                  description="Đơn vị có nhiều lượt đăng ký nhất trong kỳ."
                >
                  <BarList
                    defaultColor={colors.viz[1]}
                    limit={5}
                    items={bars(unitItems)}
                    onSelect={(bar) =>
                      drillTo(report.scope === 'diocese' ? 'deanery' : 'parish', bar.key, bar.label)
                    }
                  />
                </ChartCard>
              ) : (
                <ChartCard
                  busy={busy}
                  title="Theo loại khóa"
                  description="Lượt đăng ký theo loại khóa."
                >
                  <DonutChart
                    centerLabel="Đăng ký"
                    otherColor={colors.vizNeutral}
                    segments={breakdownsOf(report, 'courseType').map((item, index) => ({
                      key: item.key,
                      label: keyLabel(item.key, item.label),
                      value: metricNumber(item, 'registrations'),
                      color: orderedColor(index, colors),
                    }))}
                    onSelect={(segment) => drillTo('courseType', segment.key, segment.label)}
                  />
                </ChartCard>
              )}
            </>
          )}

          {!systemWide ? (
            <Button label="Xem phân tích chi tiết" variant="outline" onPress={onOpenAnalysis} />
          ) : null}
        </>
      )}

      <RecordsSheet filters={filters} target={drill} onClose={() => setDrill(null)} />
    </Screen>
  );
}
