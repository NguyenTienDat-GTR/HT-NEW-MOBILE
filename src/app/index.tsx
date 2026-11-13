import { Redirect, type Href } from 'expo-router';

import { useGateTarget } from '@/features/auth/presentation/use-gate-target';

/** Route gốc "/": chuyển tới màn phù hợp với trạng thái phiên (cùng logic với các cổng ở layout gốc). */
export default function Index() {
  const target = useGateTarget();
  if (target === 'loading') return null;
  return <Redirect href={`/${target}` as Href} />;
}
