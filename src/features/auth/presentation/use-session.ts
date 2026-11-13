import { useCallback, useEffect } from 'react';

import { isAppError } from '@/core/domain/app-error';

import { useAuthDependencies } from './auth-context';
import { useAuthStore } from './auth-store';

function useRestoreSession(): () => Promise<void> {
  const deps = useAuthDependencies();
  return useCallback(async () => {
    const { setAuthenticated, setAnonymous, setUnreachable } = useAuthStore.getState();
    try {
      const user = await deps.restoreSession.execute();
      if (user) setAuthenticated(user);
      else setAnonymous();
    } catch (error) {
      // Mất mạng/lỗi máy chủ lúc mở app: giữ phiên, cho thử lại.
      if (
        isAppError(error) &&
        (error.kind === 'network' || error.kind === 'timeout' || error.kind === 'server')
      ) {
        setUnreachable();
      } else {
        setAnonymous();
      }
    }
  }, [deps]);
}

/** Khôi phục phiên khi mở app (gọi MỘT lần ở layout gốc) và lắng nghe sự kiện hết phiên để về màn đăng nhập. */
export function useSessionBootstrap(): void {
  const deps = useAuthDependencies();
  const restore = useRestoreSession();

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(
    () =>
      deps.sessionEvents.on('expired', () => {
        useAuthStore.getState().setAnonymous('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
      }),
    [deps],
  );
}

/** Thử lại khôi phục phiên (màn "không kết nối được"). */
export function useSessionRetry(): () => void {
  const restore = useRestoreSession();
  return useCallback(() => {
    useAuthStore.setState({ status: 'booting' });
    void restore();
  }, [restore]);
}

export function useLogout(): () => Promise<void> {
  const deps = useAuthDependencies();
  return useCallback(async () => {
    await deps.logout.execute();
    useAuthStore.getState().setAnonymous();
  }, [deps]);
}
