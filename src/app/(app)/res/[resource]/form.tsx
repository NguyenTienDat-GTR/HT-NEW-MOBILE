import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { findResourceDefinition } from '@/composition/resource-registry';
import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { ResourceFormScreen } from '@/shared/resource/ResourceFormScreen';
import { Banner } from '@/shared/ui/Banner';

/** Form tạo (không có `id`) hoặc sửa (`?id=`). Lưu xong quay lại màn trước. */
export default function ResourceFormRoute() {
  const { resource, id } = useLocalSearchParams<{ resource: string; id?: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const def = findResourceDefinition(resource);
  if (!def?.form) return <Banner tone="danger" message="Không tìm thấy màn hình này." />;

  return (
    <>
      <Stack.Screen options={{ title: id ? def.form.titleEdit : def.form.titleCreate }} />
      <ResourceFormScreen def={def} id={id} subject={user} onSaved={() => router.back()} />
    </>
  );
}
