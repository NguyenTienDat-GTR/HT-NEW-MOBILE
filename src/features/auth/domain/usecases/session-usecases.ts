import type { AuthUser, CaptchaConfig, LoginCredentials } from '../entities';
import type { AuthRepository } from '../repositories/auth-repository';

export class GetCaptchaConfig {
  constructor(private readonly repository: AuthRepository) {}

  /** Không tải được cấu hình thì coi như không bật captcha: BE vẫn là nơi quyết định cuối cùng. */
  async execute(): Promise<CaptchaConfig> {
    try {
      return await this.repository.getCaptchaConfig();
    } catch {
      return { enabled: false, siteKey: null };
    }
  }
}

export class Login {
  constructor(private readonly repository: AuthRepository) {}

  execute(credentials: LoginCredentials): Promise<AuthUser> {
    return this.repository.login({ ...credentials, username: credentials.username.trim() });
  }
}

export class RestoreSession {
  constructor(private readonly repository: AuthRepository) {}

  execute(): Promise<AuthUser | null> {
    return this.repository.restoreSession();
  }
}

export class RefreshCurrentUser {
  constructor(private readonly repository: AuthRepository) {}

  execute(): Promise<AuthUser> {
    return this.repository.fetchCurrentUser();
  }
}

/** Việc cần làm trước khi hủy phiên (token còn hiệu lực), vd. hủy đăng ký nhận push. Lỗi của hook bị bỏ qua. */
export type BeforeLogoutHook = () => Promise<void>;

export class Logout {
  constructor(
    private readonly repository: AuthRepository,
    private readonly beforeLogout: readonly BeforeLogoutHook[] = [],
  ) {}

  async execute(): Promise<void> {
    for (const hook of this.beforeLogout) {
      try {
        await hook();
      } catch {
        // Không để việc dọn dẹp phụ chặn đăng xuất.
      }
    }
    await this.repository.logout();
  }
}
