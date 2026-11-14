import { useRouter } from 'expo-router';

import { EditProfileScreen } from '@/features/account/presentation/screens/EditProfileScreen';

export default function EditProfileRoute() {
  const router = useRouter();
  return <EditProfileScreen onDone={() => router.back()} />;
}
