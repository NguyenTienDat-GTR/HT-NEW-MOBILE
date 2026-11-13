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

export class Logout {
  constructor(private readonly repository: AuthRepository) {}

  execute(): Promise<void> {
    return this.repository.logout();
  }
}
