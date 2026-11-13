import { useRouter, type Href } from 'expo-router';

import { MenuScreen } from '@/composition/screens/MenuScreen';

export default function MenuRoute() {
  const router = useRouter();
  return <MenuScreen onNavigate={(path) => router.push(path as Href)} />;
}
