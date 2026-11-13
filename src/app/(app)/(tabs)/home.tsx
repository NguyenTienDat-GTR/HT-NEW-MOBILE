import { useRouter, type Href } from 'expo-router';

import { HomeScreen } from '@/composition/screens/HomeScreen';

export default function HomeRoute() {
  const router = useRouter();
  return (
    <HomeScreen
      onOpenPath={(path) => router.push(path as Href)}
      onOpenAnalysis={() => router.push('/analytics' as Href)}
    />
  );
}
