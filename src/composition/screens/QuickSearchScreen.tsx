import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { useTheme } from '@/shared/theme/theme-provider';
import { Badge } from '@/shared/ui/Badge';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

export type QuickSearchType =
  'leader' | 'diocese' | 'deanery' | 'parish' | 'course' | 'certificate';

interface QuickSearchItem {
  id: string;
  title: string;
  subtitle?: string | null;
  status?: boolean | null;
}

interface QuickSearchGroup {
  type: QuickSearchType;
  label: string;
  items: QuickSearchItem[];
}

const MIN_LENGTH = 2;

/** Màn hình app của từng loại kết quả (web mở trang chi tiết hoặc ngăn chi tiết `?detail=`). */
const RESOURCE_OF: Record<QuickSearchType, string> = {
  leader: 'leaders',
  diocese: 'dioceses',
  deanery: 'deaneries',
  parish: 'parishes',
  course: 'courses',
  certificate: 'certificates',
};

export const quickSearchPath = (type: QuickSearchType, id: string) =>
  `/res/${RESOURCE_OF[type]}/${encodeURIComponent(id)}`;

/**
 * Tìm nhanh như ô tìm kiếm ở thanh đầu của web: huynh trưởng, giáo phận, giáo hạt, giáo xứ, khóa huấn luyện và chứng
 * nhận (GET /search/quick?q=&limit=5, BE tự lọc theo quyền và phạm vi). Chạm một kết quả để mở màn chi tiết.
 */
export function QuickSearchScreen({ onOpenPath }: { onOpenPath: (path: string) => void }) {
  const gateway = useResourceGateway();
  const { spacing } = useTheme();
  const [raw, setRaw] = useState('');
  const term = useDebouncedValue(raw.trim());
  const active = term.length >= MIN_LENGTH;
  const query = useQuery({
    queryKey: ['quick-search', term],
    queryFn: () =>
      gateway.call<QuickSearchGroup[]>('GET', '/search/quick', { query: { q: term, limit: 5 } }),
    enabled: active,
    staleTime: 30_000,
  });
  const typing = raw.trim().length >= MIN_LENGTH && raw.trim() !== term;
  const groups = active ? (query.data ?? []).filter((group) => group.items.length > 0) : [];

  return (
    <Screen>
      <TextField
        label="Tìm kiếm"
        value={raw}
        onChangeText={setRaw}
        placeholder="Huynh trưởng, đơn vị, khóa huấn luyện, chứng nhận"
        returnKeyType="search"
        autoCapitalize="none"
      />
      {raw.trim().length < MIN_LENGTH ? (
        <Text variant="secondary" tone="muted">
          Nhập ít nhất {MIN_LENGTH} ký tự để tìm huynh trưởng, đơn vị, khóa huấn luyện hoặc chứng
          nhận.
        </Text>
      ) : null}
      {query.isError ? <Banner tone="danger" message={errorMessage(query.error)} /> : null}
      {active && !typing && !query.isFetching && !query.isError && groups.length === 0 ? (
        <Text variant="secondary" tone="muted">{`Không có kết quả cho "${term}".`}</Text>
      ) : null}
      {typing || (active && query.isFetching) ? (
        <Text variant="secondary" tone="muted" accessibilityLiveRegion="polite">
          Đang tìm kiếm...
        </Text>
      ) : null}
      {groups.map((group) => (
        <View key={group.type} style={{ gap: spacing.xs }}>
          <Text variant="bodyStrong">{group.label}</Text>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {group.items.map((item) => (
              <ListRow
                key={`${group.type}:${item.id}`}
                label={item.title}
                hint={item.subtitle ?? undefined}
                onPress={() => onOpenPath(quickSearchPath(group.type, item.id))}
              />
            ))}
          </Card>
          {group.items.some((item) => item.status === false) ? (
            <Badge label="Có mục ngừng hoạt động" tone="neutral" />
          ) : null}
        </View>
      ))}
    </Screen>
  );
}
