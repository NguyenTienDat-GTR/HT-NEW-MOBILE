import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AccountProvider } from '@/features/account/presentation/account-context';
import { AnalyticsProvider } from '@/features/analytics/presentation/analytics-context';
import { AuthProvider } from '@/features/auth/presentation/auth-context';
import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { NotificationProvider } from '@/features/notifications/presentation/notifications-context';
import { ResourceProvider } from '@/shared/resource/resource-context';
import { RealtimeProvider } from '@/shared/realtime/realtime-context';
import { ThemeProvider } from '@/shared/theme/theme-provider';
import { ToastProvider } from '@/shared/ui/Toast';

import { createAppContainer, type AppContainer } from './container';

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // BE giới hạn 120 lần đọc/phút mỗi tài khoản: cache vừa đủ, không tự gọi lại khi đổi tab.
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    },
  });
}

/** Dựng container và các provider gốc đúng một lần cho cả vòng đời app. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [container] = useState<AppContainer>(() => createAppContainer());
  const [queryClient] = useState(createQueryClient);

  // Đăng xuất / hết phiên: xóa cache để tài khoản sau không thấy dữ liệu của tài khoản trước.
  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        if (state.status === 'anonymous' && previous.status !== 'anonymous') queryClient.clear();
      }),
    [queryClient],
  );

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RealtimeProvider client={container.realtime}>
            <AuthProvider deps={container.auth}>
              <NotificationProvider deps={container.notifications}>
                <AccountProvider deps={container.account}>
                  <AnalyticsProvider deps={container.analytics}>
                    <ResourceProvider gateway={container.resource}>
                      <ToastProvider>{children}</ToastProvider>
                    </ResourceProvider>
                  </AnalyticsProvider>
                </AccountProvider>
              </NotificationProvider>
            </AuthProvider>
          </RealtimeProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
