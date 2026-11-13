import { useRouter } from 'expo-router';

import { ForgotPasswordScreen } from '@/features/auth/presentation/screens/ForgotPasswordScreen';

export default function ForgotPasswordRoute() {
  const router = useRouter();
  return <ForgotPasswordScreen onBackToLogin={() => router.replace('/login')} />;
}
