import { createContext, useContext, type ReactNode } from 'react';

import { NoopRealtimeClient, type RealtimeClient } from '@/core/realtime/realtime-client';

const RealtimeContext = createContext<RealtimeClient>(new NoopRealtimeClient());

export function RealtimeProvider({
  client,
  children,
}: {
  client: RealtimeClient;
  children: ReactNode;
}) {
  return <RealtimeContext.Provider value={client}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeClient {
  return useContext(RealtimeContext);
}
