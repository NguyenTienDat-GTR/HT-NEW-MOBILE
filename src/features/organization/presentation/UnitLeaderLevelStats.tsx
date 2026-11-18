import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { fmtNumber } from '@/core/domain/number-format';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Text } from '@/shared/ui/Text';
import { useTheme } from '@/shared/theme/theme-provider';

import { levelBarRatio, parseLeaderLevelStats } from '../domain/leader-level-stats';

import type { UnitKind } from './UnitExtras';

/**
 * Thống kê huynh trưởng theo cấp độ của đơn vị. Là phần mở rộng, luôn thu gọn khi vào màn;
 * nội dung (và lệnh gọi API) chỉ có khi người dùng mở ra.
 */
export function UnitLeaderLevelStats({ kind, unitId }: { kind: UnitKind; unitId: string }) {
  return (
    <Card>
      <CollapsibleSection title="Thống kê huynh trưởng theo cấp độ">
        <StatsBody kind={kind} unitId={unitId} />
      </CollapsibleSection>
    </Card>
  );
}

function StatsBody({ kind, unitId }: { kind: UnitKind; unitId: string }) {
  const gateway = useResourceGateway();
  const { colors, radius } = useTheme();
  const query = useQuery({
    queryKey: ['unit-leader-level-stats', kind, unitId],
    queryFn: async () =>
      parseLeaderLevelStats(
        await gateway.call<unknown>('GET', `/${kind}/${encodeURIComponent(unitId)}/leader-level-stats`),
      ),
  });
  const stats = query.data;
  const max = stats?.levels.reduce((highest, level) => Math.max(highest, level.leaderCount), 0) ?? 0;

  return (
    <View style={{ gap: 12 }}>
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <Banner tone="danger" message={errorMessage(query.error)} /> : null}
      {stats && stats.levels.length === 0 ? (
        <Text variant="secondary" tone="muted">
          Chưa có danh mục cấp độ huynh trưởng.
        </Text>
      ) : null}
      {stats?.levels.map((level) => (
        <View
          key={level.levelCode}
          accessible
          accessibilityLabel={`${level.levelName}: ${fmtNumber(level.leaderCount)} huynh trưởng`}
          style={{ gap: 4 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text variant="body" style={{ flexShrink: 1 }}>
              {level.levelName}
            </Text>
            <Text variant="bodyStrong">{fmtNumber(level.leaderCount)}</Text>
          </View>
          <View
            style={{
              height: 8,
              borderRadius: radius.pill,
              backgroundColor: colors.surface2,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: 8,
                borderRadius: radius.pill,
                backgroundColor: colors.accent,
                width: `${Math.round(levelBarRatio(level.leaderCount, max) * 100)}%`,
              }}
            />
          </View>
        </View>
      ))}
      {stats ? (
        <Text variant="secondary" tone="muted">{`Tổng cộng ${fmtNumber(stats.total)} huynh trưởng`}</Text>
      ) : null}
    </View>
  );
}
