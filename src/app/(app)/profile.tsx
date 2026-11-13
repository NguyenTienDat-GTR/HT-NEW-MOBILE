import { useRouter, type Href } from 'expo-router';

import { ProfileScreen } from '@/features/account/presentation/screens/ProfileScreen';
import { useAuthStore } from '@/features/auth/presentation/auth-store';

export default function ProfileRoute() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  return (
    <ProfileScreen
      username={user?.username ?? ''}
      roleCodes={user?.roles ?? []}
      onChangeEmail={() => router.push('/change-email' as Href)}
      onChangePassword={() => router.push('/account-password' as Href)}
    />
  );
}
