import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { fmtNumber } from '@/core/domain/number-format';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { InfoRow } from '@/shared/ui/InfoRow';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Text } from '@/shared/ui/Text';

import type { DrillTarget, RecordCell } from '../../domain/entities';
import type { AnalyticsFilterState } from '../../domain/filters';
import { CARD_COLUMNS, columnLabel, formatRecordValue } from '../../domain/record-format';
import { useAnalyticsRecords } from '../use-analytics-queries';

export interface RecordsSheetProps {
  filters: AnalyticsFilterState;
  target: DrillTarget | null;
  onClose: () => void;
}

function pick(row: Record<string, RecordCell>, columns: readonly string[]): string {
  for (const column of columns) {
    const text = formatRecordValue(column, row[column]);
    if (text) return text;
  }
  return '';
}

/**
 * Danh sách hồ sơ phía sau một ô biểu đồ. Mỗi hồ sơ là một thẻ gọn (tên + 2 dòng phụ); chạm "Xem đủ thông tin"
 * để mở mọi cột còn lại. Cuộn vô hạn, mỗi trang 15 dòng (không bảng cuộn ngang).
 */
export function RecordsSheet({ filters, target, onClose }: RecordsSheetProps) {
  const query = useAnalyticsRecords(filters, target);
  const pages = useMemo(() => query.data?.pages ?? [], [query.data]);
  const rows = useMemo(() => pages.flatMap((page) => page.rows), [pages]);
  const columns = pages[0]?.columns ?? [];
  const total = pages[0]?.total ?? 0;
  const dataset = target?.dataset ?? 'leaders';
  const card = CARD_COLUMNS[dataset];

  return (
    <BottomSheet
      visible={target !== null}
      title={target?.title ?? 'Danh sách'}
      onClose={onClose}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      loadingMore={query.isFetchingNextPage}
    >
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <Banner tone="danger" message={errorMessage(query.error)} /> : null}
      {!query.isPending && !query.isError ? (
        <Text variant="secondary" tone="muted" accessibilityLiveRegion="polite">
          {fmtNumber(total)} bản ghi
        </Text>
      ) : null}

      {rows.map((row, index) => {
        const title = pick(row, card.title) || `Bản ghi ${index + 1}`;
        const subtitle = card.subtitle
          .map((column) => formatRecordValue(column, row[column]))
          .filter(Boolean);
        const extra = columns.filter((column) => column !== 'id');
        return (
          <Card key={`${String(row.id ?? row.code ?? index)}-${index}`}>
            <View style={styles.card}>
              <Text variant="bodyStrong">{title}</Text>
              {subtitle.map((text) => (
                <Text key={text} variant="secondary" tone="textSecondary">
                  {text}
                </Text>
              ))}
              <CollapsibleSection title="Xem đủ thông tin">
                {extra.map((column) => (
                  <InfoRow
                    key={column}
                    label={columnLabel(column)}
                    value={formatRecordValue(column, row[column])}
                  />
                ))}
              </CollapsibleSection>
            </View>
          </Card>
        );
      })}

      {!query.isPending && rows.length === 0 && !query.isError ? (
        <Text variant="secondary" tone="muted">
          Không có hồ sơ nào trong bộ lọc hiện tại.
        </Text>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ card: { gap: 2 } });
