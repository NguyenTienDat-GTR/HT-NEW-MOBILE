import { useRouter } from 'expo-router';

import { LoginScreen } from '@/features/auth/presentation/screens/LoginScreen';

export default function LoginRoute() {
  const router = useRouter();
  return <LoginScreen onForgotPassword={() => router.push('/forgot-password')} />;
}
