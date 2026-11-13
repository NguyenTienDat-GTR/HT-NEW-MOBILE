import { createContext, useContext, type ReactNode } from 'react';

import type { ResourceGateway } from '@/core/resource/resource-gateway';

const ResourceGatewayContext = createContext<ResourceGateway | null>(null);

export function ResourceProvider({
  gateway,
  children,
}: {
  gateway: ResourceGateway;
  children: ReactNode;
}) {
  return (
    <ResourceGatewayContext.Provider value={gateway}>{children}</ResourceGatewayContext.Provider>
  );
}

export function useResourceGateway(): ResourceGateway {
  const gateway = useContext(ResourceGatewayContext);
  if (!gateway) throw new Error('useResourceGateway phải nằm trong <ResourceProvider>');
  return gateway;
}
