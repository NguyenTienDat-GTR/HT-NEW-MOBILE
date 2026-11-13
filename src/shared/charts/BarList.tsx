import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** Giá trị hiển thị bên phải (mặc định là `value`). */
  display?: string;
  /** Dòng ghi chú nhỏ dưới thanh. */
  note?: string;
  color?: string;
}

export interface BarListProps {
  items: readonly BarItem[];
  /** Số dòng hiện khi thu gọn; nhiều hơn thì có nút "Xem thêm". */
  limit?: number;
  onSelect?: (item: BarItem) => void;
  /** Màu mặc định (token viz), dùng khi mục không có màu riêng. */
  defaultColor: string;
  emptyText?: string;
}

/**
 * Thanh ngang xếp hạng. Mỗi dòng là vùng chạm cao ≥ 48dp; nhãn dài xuống tối đa 2 dòng, giá trị luôn hiện đủ.
 * Độ dài thanh theo phần trăm của giá trị lớn nhất nên tự co theo bề rộng khung.
 */
export function BarList({
  items,
  limit = 8,
  onSelect,
  defaultColor,
  emptyText = 'Chưa có dữ liệu',
}: BarListProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) {
    return (
      <Text variant="secondary" tone="muted">
        {emptyText}
      </Text>
    );
  }
  const max = Math.max(1, ...items.map((item) => item.value));
  const shown = expanded ? items : items.slice(0, limit);

  return (
    <View style={styles.list}>
      {shown.map((item) => {
        const pct = Math.max(2, Math.round((item.value / max) * 100));
        const content = (
          <View style={styles.rowInner}>
            <View style={styles.rowTop}>
              <Text variant="body" numberOfLines={2} style={styles.label}>
                {item.label}
              </Text>
              <Text variant="bodyStrong">{item.display ?? String(item.value)}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.surface2 }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${pct}%`, backgroundColor: item.color ?? defaultColor },
                ]}
              />
            </View>
            {item.note ? (
              <Text variant="secondary" tone="muted">
                {item.note}
              </Text>
            ) : null}
          </View>
        );
        return onSelect ? (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}: ${item.display ?? item.value}${item.note ? `. ${item.note}` : ''}. Xem danh sách`}
            onPress={() => onSelect(item)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? colors.surface2 : 'transparent' },
            ]}
          >
            {content}
          </Pressable>
        ) : (
          <View
            key={item.key}
            style={styles.row}
            accessible
            accessibilityLabel={`${item.label}: ${item.display ?? item.value}`}
          >
            {content}
          </View>
        );
      })}
      {items.length > limit ? (
        <Button
          label={expanded ? 'Thu gọn' : `Xem thêm ${items.length - limit} mục`}
          variant="ghost"
          size="sm"
          onPress={() => setExpanded((value) => !value)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 2 },
  row: {
    minHeight: 48,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  rowInner: { gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  label: { flex: 1 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
});
