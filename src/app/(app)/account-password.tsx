import { useRouter } from 'expo-router';

import { ChangePasswordOtpScreen } from '@/features/account/presentation/screens/ChangePasswordOtpScreen';

export default function AccountPasswordRoute() {
  const router = useRouter();
  return <ChangePasswordOtpScreen onDone={() => router.back()} />;
}
