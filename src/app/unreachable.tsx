import { SessionUnreachableScreen } from '@/features/auth/presentation/screens/SessionUnreachableScreen';
import { useSessionRetry } from '@/features/auth/presentation/use-session';

export default function UnreachableRoute() {
  const retry = useSessionRetry();
  return <SessionUnreachableScreen onRetry={retry} />;
}
