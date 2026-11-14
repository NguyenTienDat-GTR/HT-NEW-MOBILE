import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { findResourceDefinition } from '@/composition/resource-registry';
import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { parseInitialFilters, parseInitialStatus } from '@/shared/resource/initial-filters';
import { rowId } from '@/shared/resource/use-resource';
import { ResourceListScreen } from '@/shared/resource/ResourceListScreen';
import { Banner } from '@/shared/ui/Banner';

export default function ResourceListRoute() {
  const params = useLocalSearchParams<Record<string, string | undefined>>();
  const { resource, filters } = params;
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const def = findResourceDefinition(resource);
  if (!def) return <Banner tone="danger" message="Không tìm thấy màn hình này." />;

  return (
    <>
      <Stack.Screen options={{ title: def.title }} />
      {def.renderList ? (
        def.renderList({ def, subject: user, params })
      ) : (
        <ResourceListScreen
          def={def}
          subject={user}
          onOpen={(row) =>
            router.push(`/res/${def.id}/${encodeURIComponent(rowId(def, row))}` as Href)
          }
          initialFilters={parseInitialFilters(filters)}
          initialStatus={parseInitialStatus(params.status)}
          onCreate={() => router.push(`/res/${def.id}/form` as Href)}
          onExtraCreate={(path) => router.push(path as Href)}
        />
      )}
    </>
  );
}
