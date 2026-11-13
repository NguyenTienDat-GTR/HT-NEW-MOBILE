import type { SessionTokens, TokenRefresher } from '@/core/auth/session';

import { toSessionTokens } from './auth-mapper';
import type { AuthRemoteDataSource } from './auth-remote-data-source';

/** Đổi refresh token lấy cặp token mới. Phải dùng data source gắn với HTTP client THÔ (không qua AuthenticatedHttpClient). */
export class MobileTokenRefresher implements TokenRefresher {
  constructor(
    private readonly remote: AuthRemoteDataSource,
    private readonly now: () => number = Date.now,
  ) {}

  async refresh(refreshToken: string): Promise<SessionTokens> {
    const dto = await this.remote.refresh(refreshToken);
    return toSessionTokens(dto, this.now());
  }
}
