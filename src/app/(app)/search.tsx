import { useRouter, type Href } from 'expo-router';

import { QuickSearchScreen } from '@/composition/screens/QuickSearchScreen';

export default function SearchRoute() {
  const router = useRouter();
  return <QuickSearchScreen onOpenPath={(path) => router.push(path as Href)} />;
}
