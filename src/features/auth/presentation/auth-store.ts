import { create } from 'zustand';

import type { AuthUser } from '../domain/entities';

/**
 * booting: đang khôi phục phiên · anonymous: chưa đăng nhập · authenticated: đã đăng nhập
 * unreachable: có phiên lưu nhưng không gọi được máy chủ (mất mạng) -> cho thử lại, không bắt đăng nhập lại.
 */
export type AuthStatus = 'booting' | 'anonymous' | 'authenticated' | 'unreachable';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /** Thông báo hiển thị ở màn đăng nhập (vd. phiên hết hạn, đã đổi mật khẩu). */
  notice: string | null;
  setAuthenticated: (user: AuthUser) => void;
  setAnonymous: (notice?: string | null) => void;
  setUnreachable: () => void;
  clearNotice: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'booting',
  user: null,
  notice: null,
  setAuthenticated: (user) => set({ status: 'authenticated', user, notice: null }),
  setAnonymous: (notice = null) => set({ status: 'anonymous', user: null, notice }),
  setUnreachable: () => set({ status: 'unreachable' }),
  clearNotice: () => set({ notice: null }),
}));
