import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { fmtNumber } from '@/core/domain/number-format';

import { useTheme } from '../theme/theme-provider';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

import { heatmapLayout, mixWithWhite } from './chart-math';
import { useMeasuredWidth } from './use-measured-width';

export interface HeatRow {
  key: string;
  label: string;
  cells: readonly number[];
  total: number;
}

export interface HeatmapProps {
  columns: readonly string[];
  /** Nhãn cột (đã định dạng kỳ). */
  columnLabel: (column: string) => string;
  rows: readonly HeatRow[];
  hue: string;
  onSelect?: (row: HeatRow) => void;
}

const NAME_WIDTH = 92;
const TOTAL_WIDTH = 40;
const CELL_HEIGHT = 28;

/**
 * Bản đồ nhiệt đơn vị × kỳ. Không cuộn ngang: nếu ô nhỏ hơn 22px thì chia trang theo kỳ (nút ‹ ›)
 * để số liệu và nhãn luôn đọc được. Ô đậm = nhiều; ô 0 dùng nền phụ.
 */
export function Heatmap({ columns, columnLabel, rows, hue, onSelect }: HeatmapProps) {
  const { colors } = useTheme();
  const [width, onLayout] = useMeasuredWidth();
  const [start, setStart] = useState(0);
  const layout = heatmapLayout(width || 320, columns.length, NAME_WIDTH + TOTAL_WIDTH);
  const first = Math.min(start, Math.max(0, columns.length - layout.visibleColumns));
  const visible = columns.slice(first, first + layout.visibleColumns);
  const max = Math.max(1, ...rows.flatMap((row) => row.cells));
  // Số trong ô dùng cỡ 12 (không nhỏ hơn): chỉ hiện khi ô đủ rộng cho số có dấu phân cách, còn lại xem qua nút chạm.
  const showNumbers = layout.cellWidth >= 34;

  return (
    <View onLayout={onLayout} style={styles.box}>
      {layout.paged ? (
        <View style={styles.pager}>
          <Button
            label="‹ Trước"
            variant="outline"
            size="sm"
            fullWidth={false}
            disabled={first === 0}
            onPress={() => setStart(Math.max(0, first - layout.visibleColumns))}
          />
          <Text variant="secondary" tone="muted" accessibilityLiveRegion="polite">
            {columnLabel(visible[0] ?? '')} – {columnLabel(visible[visible.length - 1] ?? '')}
          </Text>
          <Button
            label="Sau ›"
            variant="outline"
            size="sm"
            fullWidth={false}
            disabled={first + layout.visibleColumns >= columns.length}
            onPress={() => setStart(first + layout.visibleColumns)}
          />
        </View>
      ) : null}

      <View style={styles.headerRow}>
        <View style={{ width: NAME_WIDTH }} />
        {visible.map((column) => (
          <Text
            key={column}
            variant="secondary"
            tone="muted"
            align="center"
            style={{ width: layout.cellWidth, fontSize: 12, lineHeight: 16 }}
            numberOfLines={1}
          >
            {layout.cellWidth < 40 ? columnLabel(column).split('/')[0] : columnLabel(column)}
          </Text>
        ))}
        <Text variant="secondary" tone="muted" align="right" style={{ width: TOTAL_WIDTH }}>
          Tổng
        </Text>
      </View>

      {rows.map((row) => {
        const content = (
          <View style={styles.row}>
            <Text variant="secondary" numberOfLines={2} style={{ width: NAME_WIDTH }}>
              {row.label}
            </Text>
            {visible.map((column, index) => {
              const value = row.cells[first + index] ?? 0;
              const ratio = value / max;
              const background =
                value > 0 ? mixWithWhite(hue, 0.15 + 0.85 * ratio) : colors.surface2;
              return (
                <View
                  key={column}
                  style={[
                    styles.cell,
                    { width: layout.cellWidth - 2, backgroundColor: background },
                  ]}
                  accessibilityElementsHidden
                >
                  {showNumbers && value > 0 ? (
                    <Text
                      variant="secondary"
                      style={{
                        fontSize: 12,
                        lineHeight: 16,
                        color: ratio > 0.5 ? colors.onSolid : colors.foreground,
                      }}
                    >
                      {fmtNumber(value)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
            <Text variant="label" align="right" style={{ width: TOTAL_WIDTH }}>
              {fmtNumber(row.total)}
            </Text>
          </View>
        );
        const label = `${row.label}: tổng ${fmtNumber(row.total)}`;
        return onSelect ? (
          <Pressable
            key={row.key}
            accessibilityRole="button"
            accessibilityLabel={`${label}. Xem danh sách`}
            onPress={() => onSelect(row)}
            style={({ pressed }) => [
              styles.press,
              { backgroundColor: pressed ? colors.surface2 : 'transparent' },
            ]}
          >
            {content}
          </Pressable>
        ) : (
          <View key={row.key} style={styles.press} accessible accessibilityLabel={label}>
            {content}
          </View>
        );
      })}

      <View style={styles.scale} accessibilityElementsHidden>
        <Text variant="secondary" tone="muted">
          Ít
        </Text>
        {[0.15, 0.4, 0.65, 0.9, 1].map((ratio) => (
          <View
            key={ratio}
            style={[styles.swatch, { backgroundColor: mixWithWhite(hue, ratio) }]}
          />
        ))}
        <Text variant="secondary" tone="muted">
          Nhiều
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 4 },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 4,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  press: { minHeight: 44, borderRadius: 6, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: {
    height: CELL_HEIGHT,
    marginHorizontal: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scale: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 4 },
  swatch: { width: 20, height: 10, borderRadius: 2 },
});
