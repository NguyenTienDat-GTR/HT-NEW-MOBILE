import { useRouter, type Href } from 'expo-router';

import { findResourceDefinition } from '@/composition/resource-registry';
import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { ResourceListScreen } from '@/shared/resource/ResourceListScreen';
import { rowId } from '@/shared/resource/use-resource';
import { Banner } from '@/shared/ui/Banner';

/** Tab "Khóa huấn luyện": danh sách khóa theo quyền, cùng màn danh sách chung với Menu > Huấn luyện. */
export default function CoursesTab() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const def = findResourceDefinition('courses');
  if (!def) return <Banner tone="danger" message="Không tìm thấy màn hình này." />;
  if (def.renderList) return def.renderList({ def, subject: user, params: {} });
  return (
    <ResourceListScreen
      def={def}
      subject={user}
      onOpen={(row) => router.push(`/res/${def.id}/${encodeURIComponent(rowId(def, row))}` as Href)}
      onCreate={() => router.push(`/res/${def.id}/form` as Href)}
    />
  );
}
