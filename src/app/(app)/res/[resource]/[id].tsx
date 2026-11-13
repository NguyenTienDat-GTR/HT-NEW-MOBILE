import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { findResourceDefinition } from '@/composition/resource-registry';
import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { ResourceDetailScreen } from '@/shared/resource/ResourceDetailScreen';
import { Banner } from '@/shared/ui/Banner';

export default function ResourceDetailRoute() {
  const { resource, id } = useLocalSearchParams<{ resource: string; id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const def = findResourceDefinition(resource);
  if (!def || !id) return <Banner tone="danger" message="Không tìm thấy màn hình này." />;

  const onEdit = () => router.push(`/res/${def.id}/form?id=${encodeURIComponent(id)}` as Href);
  return (
    <>
      <Stack.Screen options={{ title: def.singular }} />
      {def.renderDetail ? (
        def.renderDetail({ def, id, subject: user, onEdit })
      ) : (
        <ResourceDetailScreen def={def} id={id} subject={user} onEdit={onEdit} />
      )}
    </>
  );
}
