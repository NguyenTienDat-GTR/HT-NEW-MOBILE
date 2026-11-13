import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { findResourceDefinition } from '@/composition/resource-registry';
import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { rowId } from '@/shared/resource/use-resource';
import { ResourceListScreen } from '@/shared/resource/ResourceListScreen';
import { Banner } from '@/shared/ui/Banner';

export default function ResourceListRoute() {
  const { resource } = useLocalSearchParams<{ resource: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const def = findResourceDefinition(resource);
  if (!def) return <Banner tone="danger" message="Không tìm thấy màn hình này." />;

  return (
    <>
      <Stack.Screen options={{ title: def.title }} />
      {def.renderList ? (
        def.renderList({ def, subject: user })
      ) : (
        <ResourceListScreen
          def={def}
          subject={user}
          onOpen={(row) =>
            router.push(`/res/${def.id}/${encodeURIComponent(rowId(def, row))}` as Href)
          }
          onCreate={() => router.push(`/res/${def.id}/form` as Href)}
        />
      )}
    </>
  );
}
