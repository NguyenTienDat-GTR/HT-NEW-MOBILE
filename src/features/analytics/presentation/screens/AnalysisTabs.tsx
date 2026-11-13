import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { fmtDecimal, fmtNumber, fmtPercent } from '@/core/domain/number-format';
import { BarList, type BarItem } from '@/shared/charts/BarList';
import { ChartCard } from '@/shared/charts/ChartCard';
import { ColumnChart } from '@/shared/charts/ColumnChart';
import { DonutChart } from '@/shared/charts/DonutChart';
import { FunnelChart } from '@/shared/charts/FunnelChart';
import { GaugeRow } from '@/shared/charts/RadialGauge';
import { Heatmap } from '@/shared/charts/Heatmap';
import { PyramidChart } from '@/shared/charts/PyramidChart';
import { TrendChart } from '@/shared/charts/TrendChart';
import { useTheme } from '@/shared/theme/theme-provider';
import { FilterChips } from '@/shared/ui/FilterChips';
import { Text } from '@/shared/ui/Text';

import type { AnalyticsReport, Breakdown, DrillTarget } from '../../domain/entities';
import type { AnalyticsFilterState } from '../../domain/filters';
import { FUNNEL_LABELS, GROUP_BY_OPTIONS, keyLabel, kpiLabel } from '../../domain/labels';
import {
  breakdownsOf,
  formatPeriod,
  metricNullable,
  metricNumber,
  toChartRows,
} from '../../domain/selectors';
import { heatData, statusSegments, toTrendRows, trendSeries } from '../chart-data';
import { orderedColor, statusColor } from '../chart-theme';
import { AlertsList } from '../components/AlertsList';
import { BreakdownCards, type BreakdownCardItem } from '../components/BreakdownCards';
import { KpiGrid } from '../components/KpiGrid';

export interface TabProps {
  report: AnalyticsReport;
  filters: AnalyticsFilterState;
  busy: boolean;
  onDrill: (target: DrillTarget) => void;
}

const GROUP_METRIC_LABELS: Record<string, string> = {
  registrations: 'Đăng ký',
  attended: 'Tham dự',
  passed: 'Đạt',
  total: 'Tổng',
  approved: 'Đã duyệt',
  pending: 'Chờ duyệt',
  rejected: 'Từ chối',
  count: 'Số lượng',
  active: 'Hoạt động',
  trained: 'Đã qua huấn luyện',
};

function gaugesOf(report: AnalyticsReport, items: { key: string; color: string }[]) {
  return items.flatMap((item) => {
    const kpi = report.kpis.find((entry) => entry.key === item.key);
    if (!kpi) return [];
    return [
      {
        key: item.key,
        label: kpiLabel(item.key),
        value: kpi.value,
        color: item.color,
        hint: kpi.denominator
          ? `${fmtNumber(kpi.numerator)} / ${fmtNumber(kpi.denominator)}`
          : undefined,
      },
    ];
  });
}

/**
 * Phân tích theo nhóm do người dùng chọn ở bộ lọc: nằm ngay dưới chỉ số chính; đổi chỉ số so sánh bằng chip,
 * chạm một nhóm để xem danh sách chi tiết.
 */
function GroupedSection({
  report,
  busy,
  metrics,
  onSelect,
}: {
  report: AnalyticsReport;
  busy: boolean;
  metrics: readonly string[];
  onSelect: (dimension: string, key: string, label: string) => void;
}) {
  const { colors } = useTheme();
  const [metric, setMetric] = useState(metrics[0] ?? 'count');
  const groupBy = report.filters.groupBy;
  if (!groupBy) return null;
  const bars: BarItem[] = [...breakdownsOf(report, 'grouped')]
    .sort((a, b) => metricNumber(b, metric) - metricNumber(a, metric))
    .map((item) => ({
      key: item.key,
      label: keyLabel(item.key, item.label),
      value: metricNumber(item, metric),
      display: fmtNumber(metricNumber(item, metric)),
      note: metrics
        .filter((key) => key !== metric)
        .map((key) => `${GROUP_METRIC_LABELS[key] ?? key} ${fmtNumber(metricNumber(item, key))}`)
        .join(' · '),
    }));
  const title = GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label ?? 'nhóm';
  return (
    <ChartCard
      busy={busy}
      title={`Phân tích theo ${title.toLowerCase()}`}
      description="Do bạn chọn ở bộ lọc “Phân tích theo nhóm”. Chạm một nhóm để xem danh sách chi tiết."
      tone={colors.viz[1]}
    >
      <FilterChips
        options={metrics.map((key) => ({ value: key, label: GROUP_METRIC_LABELS[key] ?? key }))}
        value={metric}
        onChange={setMetric}
      />
      <BarList
        defaultColor={colors.viz[1]}
        limit={15}
        items={bars}
        emptyText="Không có dữ liệu để nhóm theo tiêu chí này trong bộ lọc hiện tại."
        onSelect={(bar) => onSelect(groupBy, bar.key, bar.label)}
      />
    </ChartCard>
  );
}

function HeatSection({
  report,
  busy,
  title,
  description,
  hue,
  onSelect,
}: {
  report: AnalyticsReport;
  busy: boolean;
  title: string;
  description: string;
  hue: string;
  onSelect?: (key: string, label: string) => void;
}) {
  const { colors } = useTheme();
  const { columns, rows } = heatData(report);
  if (rows.length === 0) return null;
  return (
    <ChartCard busy={busy} title={title} description={description} tone={colors.viz[6]}>
      <Heatmap
        columns={columns}
        columnLabel={formatPeriod}
        rows={rows}
        hue={hue}
        onSelect={onSelect ? (row) => onSelect(row.key, row.label) : undefined}
      />
    </ChartCard>
  );
}

const unitDimension = (report: AnalyticsReport): 'deanery' | 'parish' =>
  breakdownsOf(report, 'deanery').length > 0 ? 'deanery' : 'parish';

// ------------------------------------------------------------------ Khóa huấn luyện

export function CoursesTab({ report, filters, busy, onDrill }: TabProps) {
  const { colors } = useTheme();
  const rows = useMemo(
    () => toTrendRows(toChartRows(report.trends, report.previousTrends)),
    [report.trends, report.previousTrends],
  );
  const drill = (dimension: string, value: string, label: string): void =>
    onDrill({ dataset: 'participations', dimension, value, title: `Hồ sơ đăng ký · ${label}` });
  const unitType = unitDimension(report);
  const units = breakdownsOf(report, unitType);

  const asBars = (items: Breakdown[]): BarItem[] =>
    items.map((item) => ({
      key: item.key,
      label: keyLabel(item.key, item.label),
      value: metricNumber(item, 'registrations'),
      display: fmtNumber(metricNumber(item, 'registrations')),
      note: `Tham dự ${fmtNumber(metricNumber(item, 'attended'))} · Đạt ${fmtNumber(metricNumber(item, 'passed'))} (${fmtPercent(metricNullable(item, 'passRate'))})`,
    }));

  const courseCards: BreakdownCardItem[] = breakdownsOf(report, 'course').map((item) => ({
    key: item.key,
    title: item.label ?? item.key,
    subtitle: [
      String(item.metrics.courseTypeLabel ?? ''),
      keyLabel(String(item.metrics.organizingStatus ?? '')),
    ]
      .filter(Boolean)
      .join(' · '),
    primary: [
      { label: 'Đăng ký', value: fmtNumber(metricNumber(item, 'registrations')) },
      { label: 'Đạt', value: fmtNumber(metricNumber(item, 'passed')) },
      { label: 'Tỷ lệ đạt', value: fmtPercent(metricNullable(item, 'passRate')) },
    ],
    extra: [
      {
        label: 'Bắt đầu',
        value: String(item.metrics.startDate ?? '')
          .split('-')
          .reverse()
          .join('/'),
      },
      { label: 'Tham dự', value: fmtNumber(metricNumber(item, 'attended')) },
      {
        label: 'Điểm trung bình',
        value: metricNumber(item, 'attended')
          ? fmtDecimal(metricNullable(item, 'averageScore'))
          : '—',
      },
    ],
  }));

  return (
    <View style={{ gap: 12 }}>
      <KpiGrid
        report={report}
        busy={busy}
        keys={[
          'totalCourses',
          'registrations',
          'attendanceRate',
          'passRate',
          'cancellationRate',
          'rejectionRate',
          'certificateRate',
          'averageScore',
          'trainedLeaders',
        ]}
      />
      <GroupedSection
        report={report}
        busy={busy}
        metrics={['registrations', 'attended', 'passed']}
        onSelect={drill}
      />

      <ChartCard
        busy={busy}
        title="Đăng ký, tham dự và đạt theo kỳ"
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
        description="Mỗi bước là tập con của bước trước. Chạm để xem hồ sơ."
      >
        <FunnelChart
          steps={report.funnel.map((s) => ({
            key: s.key,
            label: FUNNEL_LABELS[s.key] ?? s.key,
            count: s.count,
            rateOfPrevious: s.rateOfPrevious,
          }))}
          onSelect={(step) => drill('funnel', step.key, step.label)}
        />
      </ChartCard>
      <ChartCard
        busy={busy}
        title="Tỷ lệ chính"
        description="Ba tỷ lệ chính của kỳ, tính trên cùng tập hồ sơ."
        tone={colors.viz[2]}
      >
        <GaugeRow
          items={gaugesOf(report, [
            { key: 'attendanceRate', color: colors.viz[1] },
            { key: 'passRate', color: colors.viz[2] },
            { key: 'certificateRate', color: colors.viz[3] },
          ])}
        />
      </ChartCard>
      <ChartCard
        busy={busy}
        title="Trạng thái hồ sơ"
        description="Hồ sơ theo trạng thái tham dự. Chạm để xem hồ sơ."
        tone={colors.viz[1]}
      >
        <DonutChart
          centerLabel="Hồ sơ"
          otherColor={colors.vizNeutral}
          segments={statusSegments(breakdownsOf(report, 'participationStatus'), colors)}
          onSelect={(s) => drill('participationStatus', s.key, s.label)}
        />
      </ChartCard>
      <ChartCard
        busy={busy}
        title="Phân bố điểm"
        description="Số hồ sơ theo điểm tổng kết (thang 10)."
        tone={colors.viz[4]}
      >
        <ColumnChart
          ariaLabel="Phân bố điểm tổng kết"
          color={colors.viz[4]}
          items={breakdownsOf(report, 'scoreBucket').map((item) => ({
            key: item.key,
            label: item.key,
            value: metricNumber(item, 'count'),
          }))}
        />
      </ChartCard>
      <ChartCard
        busy={busy}
        title="Theo loại khóa"
        description="Lượt đăng ký theo loại khóa. Chạm để xem hồ sơ."
      >
        <BarList
          defaultColor={colors.viz[0]}
          items={asBars(breakdownsOf(report, 'courseType'))}
          onSelect={(b) => drill('courseType', b.key, b.label)}
        />
      </ChartCard>
      <ChartCard
        busy={busy}
        title={
          units.length > 0
            ? unitType === 'deanery'
              ? 'Theo giáo hạt'
              : 'Theo giáo xứ'
            : 'Theo cấp bậc'
        }
        description="Lượt đăng ký, nhiều nhất trước."
      >
        <BarList
          defaultColor={colors.viz[1]}
          items={asBars(units.length > 0 ? units : breakdownsOf(report, 'leaderLevel'))}
          onSelect={(b) => drill(units.length > 0 ? unitType : 'leaderLevel', b.key, b.label)}
        />
      </ChartCard>
      {units.length > 0 ? (
        <ChartCard
          busy={busy}
          title="Theo cấp bậc"
          description="Lượt đăng ký theo cấp bậc hiện tại của huynh trưởng."
        >
          <BarList
            defaultColor={colors.viz[6]}
            items={asBars(breakdownsOf(report, 'leaderLevel'))}
            onSelect={(b) => drill('leaderLevel', b.key, b.label)}
          />
        </ChartCard>
      ) : null}
      <ChartCard
        busy={busy}
        title="Theo giới tính"
        description="Giới tính ghi trong hồ sơ huynh trưởng."
      >
        <DonutChart
          centerLabel="Đăng ký"
          otherColor={colors.vizNeutral}
          segments={statusSegments(breakdownsOf(report, 'gender'), colors, 'registrations')}
          onSelect={(s) => drill('gender', s.key, s.label)}
        />
      </ChartCard>
      <HeatSection
        report={report}
        busy={busy}
        title="Mức độ đăng ký theo đơn vị và kỳ"
        description="Số đăng ký theo đơn vị (hoặc cấp bậc) và kỳ; ô đậm là nhiều."
        hue={colors.viz[0]}
        onSelect={(key, label) =>
          drill(
            report.scope === 'diocese'
              ? 'deanery'
              : report.scope === 'deanery'
                ? 'parish'
                : 'leaderLevel',
            key,
            label,
          )
        }
      />
      <ChartCard
        busy={busy}
        title="Chi tiết từng khóa"
        description="Chạm một khóa để mở thêm số liệu và xem hồ sơ."
        tone={colors.viz[0]}
      >
        <BreakdownCards
          items={courseCards}
          drillLabel="Xem hồ sơ của khóa"
          onDrill={(item) => drill('course', item.key, item.title)}
        />
      </ChartCard>
      {report.alerts.length > 0 ? (
        <ChartCard
          busy={busy}
          title="Điểm cần chú ý"
          description="Ngưỡng và mẫu tối thiểu được cố định để tránh báo động từ mẫu nhỏ."
        >
          <AlertsList alerts={report.alerts} />
        </ChartCard>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------- Chứng nhận

export function CertificatesTab({ report, busy, onDrill }: TabProps) {
  const { colors } = useTheme();
  const rows = useMemo(
    () => toTrendRows(toChartRows(report.trends, report.previousTrends)),
    [report.trends, report.previousTrends],
  );
  const drill = (dimension: string, value: string, label: string): void =>
    onDrill({ dataset: 'certificates', dimension, value, title: `Chứng nhận · ${label}` });
  const unitType = unitDimension(report);
  const kpi = (key: string) => report.kpis.find((item) => item.key === key);
  const statuses = breakdownsOf(report, 'approvalStatus');

  const asBars = (items: Breakdown[]): BarItem[] =>
    items.map((item) => ({
      key: item.key,
      label: keyLabel(item.key, item.label),
      value: metricNumber(item, 'total'),
      display: fmtNumber(metricNumber(item, 'total')),
      note: `Đã duyệt ${fmtNumber(metricNumber(item, 'approved'))} · Chờ ${fmtNumber(metricNumber(item, 'pending'))} · Từ chối ${fmtNumber(metricNumber(item, 'rejected'))}`,
    }));

  return (
    <View style={{ gap: 12 }}>
      <KpiGrid
        report={report}
        busy={busy}
        keys={[
          'totalCertificates',
          'approvalRate',
          'conversionRate',
          'medianApprovalHours',
          'pending',
          'rejected',
          'revoked',
          'exceptionRate',
        ]}
      />
      <GroupedSection
        report={report}
        busy={busy}
        metrics={['total', 'approved', 'pending', 'rejected']}
        onSelect={drill}
      />

      <ChartCard
        busy={busy}
        title="Chứng nhận theo trạng thái và kỳ"
        description="Theo ngày cấp, hoặc ngày tạo khi chưa cấp để hồ sơ chờ duyệt không bị bỏ sót."
      >
        <TrendChart
          ariaLabel="Chứng nhận theo trạng thái"
          rows={rows}
          series={trendSeries(['approved', 'pending', 'rejected', 'revoked'], colors)}
          variant="stackedBar"
          formatPeriod={formatPeriod}
        />
      </ChartCard>
      <ChartCard
        busy={busy}
        title="Trạng thái duyệt"
        description="Cơ cấu trạng thái trong kỳ. Chạm để xem chứng nhận."
      >
        {statuses.length > 0 ? (
          <View style={{ gap: 12 }}>
            <DonutChart
              centerLabel="Chứng nhận"
              otherColor={colors.vizNeutral}
              segments={statusSegments(statuses, colors)}
              onSelect={(s) => drill('approvalStatus', s.key, s.label)}
            />
            <View style={{ gap: 4 }}>
              <Text variant="secondary" tone="muted">
                Hệ thống gợi ý:{' '}
                <Text variant="label">{fmtPercent(kpi('systemSuggestedRate')?.value)}</Text>
              </Text>
              <Text variant="secondary" tone="muted">
                Giờ duyệt trung bình:{' '}
                <Text variant="label">{fmtDecimal(kpi('averageApprovalHours')?.value)} giờ</Text>
              </Text>
              {kpi('revoked') ? (
                <Text variant="secondary" tone="muted">
                  Đã thu hồi: <Text variant="label">{fmtNumber(kpi('revoked')?.value)}</Text>
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <Text variant="secondary" tone="muted">
            Chưa có dữ liệu
          </Text>
        )}
      </ChartCard>
      <ChartCard
        busy={busy}
        title="Chuyển đổi từ kết quả đạt"
        description="Hồ sơ đạt đã được cấp chứng nhận trong cùng tập hồ sơ."
      >
        <FunnelChart
          steps={report.funnel.map((s) => ({
            key: s.key,
            label: FUNNEL_LABELS[s.key] ?? s.key,
            count: s.count,
            rateOfPrevious: s.rateOfPrevious,
          }))}
        />
      </ChartCard>
      <ChartCard
        busy={busy}
        title="Tốc độ duyệt"
        description="Chứng nhận đã duyệt chia theo thời gian từ lúc tạo đến lúc duyệt."
        tone={colors.viz[1]}
      >
        <ColumnChart
          ariaLabel="Phân bố thời gian duyệt"
          color={colors.viz[1]}
          items={breakdownsOf(report, 'approvalTime').map((item) => ({
            key: item.key,
            label: keyLabel(item.key),
            value: metricNumber(item, 'count'),
            color: statusColor(item.key, colors),
          }))}
        />
      </ChartCard>
      <ChartCard busy={busy} title="Theo khóa huấn luyện" description="Nhiều nhất trước.">
        <BarList
          defaultColor={colors.viz[0]}
          items={asBars(breakdownsOf(report, 'course'))}
          onSelect={(b) => drill('course', b.key, b.label)}
        />
      </ChartCard>
      <ChartCard busy={busy} title="Theo loại khóa">
        <BarList
          defaultColor={colors.viz[6]}
          items={asBars(breakdownsOf(report, 'courseType'))}
          onSelect={(b) => drill('courseType', b.key, b.label)}
        />
      </ChartCard>
      {breakdownsOf(report, unitType).length > 0 ? (
        <ChartCard busy={busy} title={unitType === 'deanery' ? 'Theo giáo hạt' : 'Theo giáo xứ'}>
          <BarList
            defaultColor={colors.viz[1]}
            items={asBars(breakdownsOf(report, unitType))}
            onSelect={(b) => drill(unitType, b.key, b.label)}
          />
        </ChartCard>
      ) : null}
      <HeatSection
        report={report}
        busy={busy}
        title="Chứng nhận theo đơn vị và kỳ"
        description="Số chứng nhận theo đơn vị (hoặc cấp bậc) và kỳ."
        hue={colors.viz[2]}
      />
      {report.alerts.length > 0 ? (
        <ChartCard busy={busy} title="Điểm cần chú ý" tone={colors.viz[3]}>
          <AlertsList alerts={report.alerts} />
        </ChartCard>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------- Huynh trưởng

export function LeadersTab({ report, filters, busy, onDrill }: TabProps) {
  const { colors } = useTheme();
  const rows = useMemo(
    () => toTrendRows(toChartRows(report.trends, report.previousTrends)),
    [report.trends, report.previousTrends],
  );
  const drill = (dimension: string, value: string, label: string): void =>
    onDrill({ dataset: 'leaders', dimension, value, title: `Huynh trưởng · ${label}` });
  const unitType = unitDimension(report);
  const units = breakdownsOf(report, unitType);
  const asBars = (items: Breakdown[]): BarItem[] =>
    items.map((item) => ({
      key: item.key,
      label: keyLabel(item.key, item.label),
      value: metricNumber(item, 'count'),
      display: `${fmtNumber(metricNumber(item, 'count'))} · ${fmtPercent(metricNullable(item, 'share'))}`,
      note: `Hoạt động ${fmtNumber(metricNumber(item, 'active'))} · Đã qua huấn luyện ${fmtNumber(metricNumber(item, 'trained'))}`,
    }));
  const promotions = breakdownsOf(report, 'promotionLevel');

  return (
    <View style={{ gap: 12 }}>
      <KpiGrid
        report={report}
        busy={busy}
        keys={[
          'totalLeaders',
          'activeRate',
          'trainedRate',
          'newLeaders',
          'promotions',
          'femaleRate',
          'averageAge',
          'youthRate',
        ]}
      />
      <GroupedSection
        report={report}
        busy={busy}
        metrics={['count', 'active', 'trained']}
        onSelect={drill}
      />

      <ChartCard
        busy={busy}
        title="Hồ sơ mới và thăng cấp theo kỳ"
        description="Hồ sơ mới theo ngày tạo trong hệ thống; thăng cấp lấy từ lịch sử cấp bậc."
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
        title="Quy mô hồ sơ tích lũy"
        description="Số hồ sơ cộng dồn theo kỳ."
        tone={colors.viz[6]}
      >
        <TrendChart
          ariaLabel="Hồ sơ tích lũy"
          rows={rows}
          series={trendSeries(['cumulative'], colors)}
          variant="area"
          formatPeriod={formatPeriod}
        />
      </ChartCard>
      <ChartCard
        busy={busy}
        title="Thăng cấp theo cấp bậc"
        description="Cấp bậc đạt được trong kỳ."
        tone={colors.viz[3]}
      >
        <BarList
          defaultColor={colors.viz[3]}
          items={promotions.map((item) => ({
            key: item.key,
            label: keyLabel(item.key, item.label),
            value: metricNumber(item, 'count'),
          }))}
          emptyText="Không có lượt thăng cấp trong kỳ."
        />
      </ChartCard>
      <ChartCard
        busy={busy}
        title="Giới tính"
        description="Cơ cấu hiện tại. Chạm để xem danh sách."
        tone={colors.viz[4]}
      >
        <DonutChart
          centerLabel="Huynh trưởng"
          otherColor={colors.vizNeutral}
          segments={statusSegments(breakdownsOf(report, 'gender'), colors)}
          onSelect={(s) => drill('gender', s.key, s.label)}
        />
      </ChartCard>
      <ChartCard busy={busy} title="Trạng thái hoạt động" tone={colors.viz[2]}>
        <DonutChart
          centerLabel="Huynh trưởng"
          otherColor={colors.vizNeutral}
          segments={statusSegments(breakdownsOf(report, 'status'), colors)}
          onSelect={(s) => drill('status', s.key, s.label)}
        />
      </ChartCard>
      <ChartCard
        busy={busy}
        title="Nhóm tuổi theo giới tính"
        description="Tháp dân số: nam bên trái, nữ bên phải, cùng một thang. Chạm một dòng để xem danh sách."
        tone={colors.viz[0]}
      >
        <PyramidChart
          leftLabel="Nam"
          rightLabel="Nữ"
          leftColor={colors.viz[0]}
          rightColor={colors.viz[1]}
          rows={breakdownsOf(report, 'agePyramid').map((item) => ({
            key: item.key,
            label: keyLabel(item.key),
            left: metricNumber(item, 'male'),
            right: metricNumber(item, 'female'),
          }))}
          onSelect={(row) => drill('ageGroup', row.key, row.label)}
        />
      </ChartCard>
      <ChartCard busy={busy} title="Cấp bậc">
        <BarList
          defaultColor={colors.viz[6]}
          items={asBars(breakdownsOf(report, 'leaderLevel'))}
          onSelect={(b) => drill('leaderLevel', b.key, b.label)}
        />
      </ChartCard>
      {units.length > 0 ? (
        <ChartCard busy={busy} title={unitType === 'deanery' ? 'Theo giáo hạt' : 'Theo giáo xứ'}>
          <BarList
            defaultColor={colors.viz[1]}
            items={asBars(units)}
            onSelect={(b) => drill(unitType, b.key, b.label)}
          />
        </ChartCard>
      ) : null}
      {report.alerts.length > 0 ? (
        <ChartCard busy={busy} title="Điểm cần chú ý">
          <AlertsList alerts={report.alerts} />
        </ChartCard>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------------- Tổ chức

export function OrganizationTab({ report, filters, busy, onDrill }: TabProps) {
  const { colors } = useTheme();
  const rows = useMemo(
    () => toTrendRows(toChartRows(report.trends, report.previousTrends)),
    [report.trends, report.previousTrends],
  );
  const unitRows = breakdownsOf(report, 'unit');
  const isDiocese = report.scope === 'diocese';
  const drill = (dimension: string, value: string, label: string): void =>
    onDrill({ dataset: 'leaders', dimension, value, title: `Huynh trưởng · ${label}` });
  const unitDim = isDiocese ? 'deanery' : 'parish';

  const unitBars: BarItem[] = [...unitRows]
    .sort((a, b) => metricNumber(b, 'leaders') - metricNumber(a, 'leaders'))
    .map((item) => ({
      key: item.key,
      label: item.label ?? item.key,
      value: metricNumber(item, 'leaders'),
      display: fmtNumber(metricNumber(item, 'leaders')),
      note: `Hoạt động ${fmtNumber(metricNumber(item, 'activeLeaders'))} · Đã qua huấn luyện ${fmtNumber(metricNumber(item, 'trainedLeaders'))}`,
    }));

  const unitCards: BreakdownCardItem[] = unitRows.map((item) => ({
    key: item.key,
    title: item.label ?? item.key,
    subtitle: item.metrics.operational === false ? 'Đang ngưng hoạt động' : undefined,
    primary: [
      { label: 'Huynh trưởng', value: fmtNumber(metricNumber(item, 'leaders')) },
      { label: 'Hoạt động', value: fmtNumber(metricNumber(item, 'activeLeaders')) },
      { label: 'Tỷ lệ đạt (kỳ)', value: fmtPercent(metricNullable(item, 'passRate')) },
    ],
    extra: [
      ...(isDiocese
        ? [{ label: 'Giáo xứ', value: fmtNumber(metricNumber(item, 'parishes')) }]
        : []),
      { label: 'Đã qua huấn luyện', value: fmtNumber(metricNumber(item, 'trainedLeaders')) },
      { label: 'Đăng ký (kỳ)', value: fmtNumber(metricNumber(item, 'registrations')) },
    ],
  }));

  return (
    <View style={{ gap: 12 }}>
      <KpiGrid
        report={report}
        busy={busy}
        keys={[
          'totalDeaneries',
          'totalParishes',
          'parishesWithoutLeaders',
          'leadersPerParish',
          'totalLeaders',
          'activeRate',
          'trainedRate',
          'newLeaders',
        ]}
      />

      <ChartCard
        busy={busy}
        title="Phát triển nhân sự theo kỳ"
        description="Hồ sơ huynh trưởng mới và thăng cấp theo kỳ."
      >
        <TrendChart
          ariaLabel="Phát triển nhân sự"
          rows={rows}
          series={trendSeries(['newLeaders', 'promotions'], colors)}
          showPrevious={filters.compare}
          formatPeriod={formatPeriod}
        />
      </ChartCard>
      <ChartCard
        busy={busy}
        title="Cấp bậc"
        description="Cơ cấu cấp bậc hiện tại. Chạm để xem danh sách."
        tone={colors.viz[6]}
      >
        <DonutChart
          centerLabel="Huynh trưởng"
          otherColor={colors.vizNeutral}
          segments={breakdownsOf(report, 'leaderLevel').map((item, index) => ({
            key: item.key,
            label: keyLabel(item.key, item.label),
            value: metricNumber(item, 'count'),
            color: orderedColor(index, colors, 8),
          }))}
          onSelect={(s) => drill('leaderLevel', s.key, s.label)}
        />
      </ChartCard>
      <ChartCard
        busy={busy}
        title="Tỉ lệ hoạt động và huấn luyện"
        description="Hoạt động và đã qua huấn luyện trên tổng huynh trưởng."
        tone={colors.viz[2]}
      >
        <GaugeRow
          items={gaugesOf(report, [
            { key: 'activeRate', color: colors.viz[2] },
            { key: 'trainedRate', color: colors.viz[6] },
          ])}
        />
      </ChartCard>
      <ChartCard
        busy={busy}
        title="Nhóm tuổi theo giới tính"
        description="Tháp dân số: nam bên trái, nữ bên phải. Chạm một dòng để xem danh sách."
        tone={colors.viz[0]}
      >
        <PyramidChart
          leftLabel="Nam"
          rightLabel="Nữ"
          leftColor={colors.viz[0]}
          rightColor={colors.viz[1]}
          rows={breakdownsOf(report, 'agePyramid').map((item) => ({
            key: item.key,
            label: keyLabel(item.key),
            left: metricNumber(item, 'male'),
            right: metricNumber(item, 'female'),
          }))}
          onSelect={(row) => drill('ageGroup', row.key, row.label)}
        />
      </ChartCard>
      {unitRows.length > 0 ? (
        <>
          <ChartCard
            busy={busy}
            title={isDiocese ? 'Huynh trưởng theo giáo hạt' : 'Huynh trưởng theo giáo xứ'}
            description="Số huynh trưởng mỗi đơn vị."
          >
            <BarList
              defaultColor={colors.viz[0]}
              items={unitBars}
              onSelect={(b) => drill(unitDim, b.key, b.label)}
            />
          </ChartCard>
          <ChartCard
            busy={busy}
            title={isDiocese ? 'Chi tiết giáo hạt' : 'Chi tiết giáo xứ'}
            description="Chạm một đơn vị để mở thêm số liệu và xem huynh trưởng."
          >
            <BreakdownCards
              items={unitCards}
              drillLabel="Xem huynh trưởng của đơn vị"
              onDrill={(item) => drill(unitDim, item.key, item.title)}
            />
          </ChartCard>
        </>
      ) : null}
      {report.alerts.length > 0 ? (
        <ChartCard busy={busy} title="Điểm cần chú ý">
          <AlertsList alerts={report.alerts} />
        </ChartCard>
      ) : null}
    </View>
  );
}
