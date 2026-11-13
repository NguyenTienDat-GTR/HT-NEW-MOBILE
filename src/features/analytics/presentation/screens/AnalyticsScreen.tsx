import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { FilterChips, type ChipOption } from '@/shared/ui/FilterChips';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

import type { DrillTarget } from '../../domain/entities';
import {
  ANALYSIS_FILTER_VISIBILITY,
  DEFAULT_FILTERS,
  type AnalysisTabId,
  type AnalyticsFilterState,
} from '../../domain/filters';
import { FilterBar } from '../components/FilterBar';
import { RecordsSheet } from '../components/RecordsSheet';
import { useAnalyticsReport, useAnalyticsScopes, useFilterOptions } from '../use-analytics-queries';

import { CertificatesTab, CoursesTab, LeadersTab, OrganizationTab } from './AnalysisTabs';

const TABS: readonly ChipOption<AnalysisTabId>[] = [
  { value: 'courses', label: 'Khóa huấn luyện' },
  { value: 'certificates', label: 'Chứng nhận' },
  { value: 'leaders', label: 'Huynh trưởng' },
  { value: 'organization', label: 'Tổ chức' },
];

/**
 * Phân tích chi tiết: 4 nhóm (Khóa huấn luyện, Chứng nhận, Huynh trưởng, Tổ chức), bộ lọc trong sheet,
 * chạm vào biểu đồ để xem danh sách hồ sơ. Giáo xứ không tổ chức khóa nên không có nhóm "Khóa huấn luyện".
 */
export function AnalyticsScreen() {
  const [rawTab, setTab] = useState<AnalysisTabId>('courses');
  const [filters, setFilters] = useState<AnalyticsFilterState>(DEFAULT_FILTERS);
  const [drill, setDrill] = useState<DrillTarget | null>(null);

  const scopes = useAnalyticsScopes();
  const activeScope = filters.scope || scopes.data?.[0]?.type || '';
  const visibleTabs = TABS.filter((tab) => !(tab.value === 'courses' && activeScope === 'parish'));
  const tab: AnalysisTabId = visibleTabs.some((t) => t.value === rawTab)
    ? rawTab
    : (visibleTabs[0]?.value ?? 'leaders');
  const query = useAnalyticsReport(tab, filters, !scopes.isLoading);
  const options = useFilterOptions(activeScope, !scopes.isLoading);
  const report = query.data;
  const busy = query.isFetching;

  // Đổi nhóm có thể khiến "phân tích theo nhóm" cũ không còn hợp lệ: bỏ nó thay vì để BE trả nhóm rỗng.
  const changeTab = (next: AnalysisTabId) => {
    const allowed = ANALYSIS_FILTER_VISIBILITY[next].groupByValues;
    if (filters.groupBy && (!allowed || !allowed.includes(filters.groupBy))) {
      setFilters({ ...filters, groupBy: '' });
    }
    setTab(next);
  };

  const common = report ? { report, filters, busy, onDrill: setDrill } : null;

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <View style={{ gap: 4 }}>
        <Text variant="secondary" tone="muted">
          Chạm vào biểu đồ để xem danh sách chi tiết.
        </Text>
      </View>

      <FilterChips options={visibleTabs} value={tab} onChange={changeTab} />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        visible={ANALYSIS_FILTER_VISIBILITY[tab]}
        options={options.data}
        scope={report?.scope ?? activeScope}
        scopes={scopes.data}
        applied={report?.filters}
        busy={busy}
      />

      {query.isError && !report ? (
        <>
          <Banner tone="danger" message={errorMessage(query.error)} />
          <Button label="Thử lại" variant="outline" onPress={() => void query.refetch()} />
        </>
      ) : !common ? (
        <LoadingState label="Đang tải số liệu…" />
      ) : (
        <View key={tab}>
          {tab === 'courses' ? <CoursesTab {...common} /> : null}
          {tab === 'certificates' ? <CertificatesTab {...common} /> : null}
          {tab === 'leaders' ? <LeadersTab {...common} /> : null}
          {tab === 'organization' ? <OrganizationTab {...common} /> : null}
        </View>
      )}

      <RecordsSheet filters={filters} target={drill} onClose={() => setDrill(null)} />
    </Screen>
  );
}
