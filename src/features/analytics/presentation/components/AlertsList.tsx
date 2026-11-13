import { StyleSheet, View } from 'react-native';

import { formatNumber } from '@/core/domain/number-format';
import { useTheme } from '@/shared/theme/theme-provider';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { CheckCircleIcon, InfoIcon, WarningIcon, WarningOctagonIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

import type { Alert, AlertSeverity } from '../../domain/entities';
import { ALERT_META, SEVERITY_LABELS } from '../../domain/labels';

const ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
const TONE: Record<AlertSeverity, BadgeTone> = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
};

function itemValue(value: number | null, suffix?: string): string | null {
  if (value === null) return null;
  const text = formatNumber(value, 1);
  if (!suffix) return text;
  return suffix.startsWith('%') ? `${text}%` : `${text} ${suffix}`;
}

/**
 * Điểm cần chú ý: mỗi mục có biểu tượng + nhãn mức độ bằng chữ (không chỉ màu), mô tả và tối đa 3 đối tượng tiêu biểu.
 * Lối tắt xử lý (href của BE) chưa có trên mobile nên chưa hiện.
 */
export function AlertsList({ alerts }: { alerts: readonly Alert[] }) {
  const { colors, iconSize, radius } = useTheme();
  const sorted = [...alerts]
    .filter((a) => ALERT_META[a.key])
    .sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

  if (sorted.length === 0) {
    return (
      <View
        style={[
          styles.empty,
          { backgroundColor: colors.badge.successBg, borderRadius: radius.panel },
        ]}
      >
        <CheckCircleIcon size={iconSize.lg} color={colors.vizGood} weight="fill" />
        <Text variant="bodyStrong">Chưa có điểm bất thường</Text>
        <Text variant="secondary" tone="muted" align="center">
          Các chỉ số đều trong ngưỡng theo dõi.
        </Text>
      </View>
    );
  }

  const palette: Record<AlertSeverity, { bar: string; icon: string; Icon: typeof InfoIcon }> = {
    critical: { bar: colors.vizCritical, icon: colors.vizCritical, Icon: WarningOctagonIcon },
    warning: { bar: colors.vizWarning, icon: colors.warning, Icon: WarningIcon },
    info: { bar: colors.viz[0], icon: colors.info, Icon: InfoIcon },
  };

  return (
    <View style={styles.list}>
      {sorted.map((alert) => {
        const meta = ALERT_META[alert.key];
        if (!meta) return null;
        const { bar, icon, Icon } = palette[alert.severity];
        return (
          <View
            key={alert.key}
            accessible
            accessibilityLabel={`${SEVERITY_LABELS[alert.severity]}. ${meta.title}. ${meta.description(alert.count)}`}
            style={[
              styles.item,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
                borderRadius: radius.panel,
              },
            ]}
          >
            <View style={[styles.bar, { backgroundColor: bar }]} />
            <Icon size={iconSize.md} color={icon} weight="bold" />
            <View style={styles.body}>
              <Text variant="bodyStrong">{meta.title}</Text>
              <Badge label={SEVERITY_LABELS[alert.severity]} tone={TONE[alert.severity]} />
              <Text variant="secondary" tone="textSecondary">
                {meta.description(alert.count)}
              </Text>
              {alert.items.slice(0, 3).map((item, index) => (
                <View key={`${item.id ?? item.label}-${index}`} style={styles.entry}>
                  <Text
                    variant="secondary"
                    tone="muted"
                    numberOfLines={2}
                    style={styles.entryLabel}
                  >
                    {item.label}
                  </Text>
                  <Text variant="label" tone="textSecondary">
                    {itemValue(item.value, meta.valueSuffix)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  empty: { alignItems: 'center', gap: 4, padding: 20 },
  item: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    paddingLeft: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  body: { flex: 1, gap: 4 },
  entry: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  entryLabel: { flex: 1 },
});
