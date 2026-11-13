import { useRouter } from 'expo-router';

import { ChangeEmailScreen } from '@/features/account/presentation/screens/ChangeEmailScreen';

export default function ChangeEmailRoute() {
  const router = useRouter();
  return <ChangeEmailScreen onDone={() => router.back()} />;
}
