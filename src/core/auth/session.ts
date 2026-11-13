/** Cặp token của phiên đăng nhập. Thời điểm hết hạn là epoch ms theo đồng hồ máy. */
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
}

/** Cổng lưu token (adapter thật dùng Keychain/Keystore). */
export interface TokenStore {
  load(): Promise<SessionTokens | null>;
  save(tokens: SessionTokens): Promise<void>;
  clear(): Promise<void>;
}

/** Cổng đổi refresh token lấy cặp token mới. Cài đặt nằm ở tính năng auth (gọi /mobile/auth/refresh). */
export interface TokenRefresher {
  refresh(refreshToken: string): Promise<SessionTokens>;
}

export type SessionEvent = 'expired';

type Listener = () => void;

/** Observer đơn giản: phiên hết hạn (refresh bị từ chối) -> UI quay về màn đăng nhập. */
export class SessionEvents {
  private readonly listeners = new Map<SessionEvent, Set<Listener>>();

  on(event: SessionEvent, listener: Listener): () => void {
    const set = this.listeners.get(event) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(event, set);
    return () => {
      set.delete(listener);
    };
  }

  emit(event: SessionEvent): void {
    this.listeners.get(event)?.forEach((listener) => listener());
  }
}
