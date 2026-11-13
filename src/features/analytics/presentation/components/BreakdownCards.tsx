import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InfoRow } from '@/shared/ui/InfoRow';
import { Text } from '@/shared/ui/Text';

export interface BreakdownCardItem {
  key: string;
  title: string;
  subtitle?: string;
  /** 2–3 số quan trọng hiện sẵn trên thẻ. */
  primary: readonly { label: string; value: string }[];
  /** Các số còn lại, chỉ hiện khi mở thẻ (thay cho các cột bị ẩn của bảng web). */
  extra: readonly { label: string; value: string }[];
}

export interface BreakdownCardsProps {
  items: readonly BreakdownCardItem[];
  onDrill?: (item: BreakdownCardItem) => void;
  drillLabel: string;
  /** Số thẻ hiện khi thu gọn. */
  limit?: number;
  emptyText?: string;
}

/**
 * Thay cho bảng nhiều cột của web (không cuộn ngang trên điện thoại): mỗi dòng là một thẻ với vài số chính,
 * chạm để mở nốt các số còn lại và nút "Xem hồ sơ".
 */
export function BreakdownCards({
  items,
  onDrill,
  drillLabel,
  limit = 5,
  emptyText = 'Chưa có dữ liệu',
}: BreakdownCardsProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  if (items.length === 0) {
    return (
      <Text variant="secondary" tone="muted">
        {emptyText}
      </Text>
    );
  }
  const shown = all ? items : items.slice(0, limit);
  return (
    <View style={styles.list}>
      {shown.map((item) => {
        const open = openKey === item.key;
        return (
          <Card
            key={item.key}
            onPress={() => setOpenKey(open ? null : item.key)}
            accessibilityLabel={`${item.title}. ${item.primary.map((p) => `${p.label} ${p.value}`).join(', ')}. ${open ? 'Thu gọn' : 'Mở chi tiết'}`}
          >
            <View style={styles.card}>
              <Text variant="bodyStrong">{item.title}</Text>
              {item.subtitle ? (
                <Text variant="secondary" tone="muted">
                  {item.subtitle}
                </Text>
              ) : null}
              <View style={styles.primary}>
                {item.primary.map((p) => (
                  <View key={p.label} style={styles.stat}>
                    <Text variant="secondary" tone="muted">
                      {p.label}
                    </Text>
                    <Text variant="bodyStrong">{p.value}</Text>
                  </View>
                ))}
              </View>
              {open ? (
                <View style={styles.extra}>
                  {item.extra.map((e) => (
                    <InfoRow key={e.label} label={e.label} value={e.value} />
                  ))}
                  {onDrill ? (
                    <Button
                      label={drillLabel}
                      variant="outline"
                      size="sm"
                      onPress={() => onDrill(item)}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          </Card>
        );
      })}
      {items.length > limit ? (
        <Button
          label={all ? 'Thu gọn' : `Xem thêm ${items.length - limit} mục`}
          variant="ghost"
          size="sm"
          onPress={() => setAll((value) => !value)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  card: { gap: 4 },
  primary: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginTop: 4 },
  stat: { minWidth: 72 },
  extra: { gap: 8, marginTop: 8 },
});
