import { Pressable, StyleSheet, View } from 'react-native';

import { fmtNumber } from '@/core/domain/number-format';
import { mixWithWhite } from '@/shared/charts/chart-math';
import { useTheme } from '@/shared/theme/theme-provider';
import {
  ArrowCounterClockwiseIcon,
  CalendarCheckIcon,
  CertificateIcon,
  ClipboardTextIcon,
  PencilLineIcon,
} from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

import type { WorkQueueItem } from '../../domain/entities';
import { WORK_QUEUE_META } from '../../domain/labels';

const ICONS = {
  pendingRegistrations: ClipboardTextIcon,
  rejectedRegistrations: ArrowCounterClockwiseIcon,
  pendingScoring: PencilLineIcon,
  closingCourses: CalendarCheckIcon,
  pendingCertificates: CertificateIcon,
} as const;

export interface WorkQueueGridProps {
  items: readonly WorkQueueItem[];
  /** Trả đường dẫn mở được trên mobile cho href của BE, hoặc null nếu màn đích chưa có (ô không bấm được). */
  openable: (key: string, href: string) => string | null;
  onOpen: (path: string) => void;
}

/** Việc cần xử lý: lưới 2 cột; ô có việc nổi bật (số đậm + chấm), ô trống mờ đi. */
export function WorkQueueGrid({ items, openable, onOpen }: WorkQueueGridProps) {
  const { colors, iconSize, radius } = useTheme();
  const tones: Record<string, string> = {
    pendingRegistrations: colors.primary,
    rejectedRegistrations: colors.vizCritical,
    pendingScoring: colors.viz[0],
    closingCourses: colors.warning,
    pendingCertificates: colors.vizGood,
  };
  const visible = items.filter((item) => WORK_QUEUE_META[item.key]);
  const rows: WorkQueueItem[][] = [];
  for (let i = 0; i < visible.length; i += 2) rows.push(visible.slice(i, i + 2));

  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row.map((i) => i.key).join('+')} style={styles.row}>
          {row.map((item) => {
            const meta = WORK_QUEUE_META[item.key];
            if (!meta) return null;
            const Icon = ICONS[item.key as keyof typeof ICONS] ?? ClipboardTextIcon;
            const tone = tones[item.key] ?? colors.primary;
            const hasWork = item.count > 0;
            const path = openable(item.key, item.href);
            const tile = (
              <View style={styles.tile}>
                <View style={[styles.icon, { backgroundColor: mixWithWhite(tone, 0.14) }]}>
                  <Icon size={iconSize.md} color={tone} weight="bold" />
                </View>
                <View style={styles.countRow}>
                  <Text variant="kpi" style={{ fontSize: 26, lineHeight: 32 }}>
                    {fmtNumber(item.count)}
                  </Text>
                  {hasWork ? (
                    <View style={[styles.dot, { backgroundColor: colors.vizSerious }]} />
                  ) : null}
                </View>
                <Text variant="bodyStrong" numberOfLines={2}>
                  {meta.title}
                </Text>
                <Text variant="secondary" tone="muted" numberOfLines={3}>
                  {hasWork ? meta.description : 'Không có việc tồn đọng.'}
                </Text>
              </View>
            );
            const label = `${meta.title}: ${fmtNumber(item.count)}`;
            const box = {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius.panel,
              opacity: hasWork ? 1 : 0.8,
            };
            return path ? (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={`${label}. Mở màn hình xử lý`}
                onPress={() => onOpen(path)}
                style={[styles.cell, box]}
              >
                {tile}
              </Pressable>
            ) : (
              <View key={item.key} accessible accessibilityLabel={label} style={[styles.cell, box]}>
                {tile}
              </View>
            );
          })}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, borderWidth: 1, padding: 12, minHeight: 48 },
  tile: { gap: 4 },
  icon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
