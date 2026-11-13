import { AppError, isAppError } from '../domain/app-error';

import type { SessionEvents, SessionTokens, TokenRefresher, TokenStore } from './session';

/** Làm mới sớm khi access token còn dưới ngưỡng này, tránh gửi request chắc chắn bị 401. */
const REFRESH_SKEW_MS = 30_000;

/**
 * Điều phối phiên: cấp access token hợp lệ cho mọi request và làm mới đúng MỘT lần khi nhiều request cùng cần
 * (single-flight). BE xoay vòng refresh token, nên gọi refresh song song sẽ làm các lời gọi sau bị 401.
 */
export class SessionCoordinator {
  private inFlight: Promise<SessionTokens> | null = null;

  constructor(
    private readonly store: TokenStore,
    private readonly refresher: TokenRefresher,
    private readonly events: SessionEvents,
    private readonly now: () => number = Date.now,
  ) {}

  async getAccessToken(): Promise<string> {
    const tokens = await this.store.load();
    if (!tokens) throw this.unauthorized();
    if (tokens.accessTokenExpiresAt - this.now() > REFRESH_SKEW_MS) return tokens.accessToken;
    return (await this.refresh(tokens)).accessToken;
  }

  /** Gọi khi BE trả 401 cho `rejectedAccessToken`: lấy token mới (hoặc token mà request khác vừa làm mới). */
  async refreshAfterRejection(rejectedAccessToken: string): Promise<string> {
    const tokens = await this.store.load();
    if (!tokens) throw this.unauthorized();
    if (tokens.accessToken !== rejectedAccessToken) return tokens.accessToken;
    return (await this.refresh(tokens)).accessToken;
  }

  private refresh(current: SessionTokens): Promise<SessionTokens> {
    this.inFlight ??= this.doRefresh(current).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async doRefresh(current: SessionTokens): Promise<SessionTokens> {
    try {
      const next = await this.refresher.refresh(current.refreshToken);
      await this.store.save(next);
      return next;
    } catch (error) {
      // Chỉ khi BE từ chối refresh token mới coi là hết phiên. Mất mạng, lỗi máy chủ... thì giữ phiên và báo lỗi.
      if (isAppError(error) && (error.kind === 'unauthorized' || error.kind === 'forbidden')) {
        await this.store.clear();
        this.events.emit('expired');
        throw this.unauthorized();
      }
      throw error;
    }
  }

  private unauthorized(): AppError {
    return new AppError('unauthorized', 'Phiên đăng nhập đã hết hạn', { status: 401 });
  }
}
