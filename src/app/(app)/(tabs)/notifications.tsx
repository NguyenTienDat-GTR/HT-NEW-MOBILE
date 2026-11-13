import { useRouter, type Href } from 'expo-router';

import { NotificationsScreen } from '@/features/notifications/presentation/screens/NotificationsScreen';

export default function NotificationsRoute() {
  const router = useRouter();
  return <NotificationsScreen onOpenPath={(path) => router.push(path as Href)} />;
}
