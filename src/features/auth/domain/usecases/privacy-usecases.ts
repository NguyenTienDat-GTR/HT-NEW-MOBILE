import type { PrivacyConsentStatus } from '../entities';
import type { AuthRepository } from '../repositories/auth-repository';

export class GetPrivacyConsent {
  constructor(private readonly repository: AuthRepository) {}

  execute(): Promise<PrivacyConsentStatus> {
    return this.repository.getPrivacyConsent();
  }
}

export class AcceptPrivacyConsent {
  constructor(private readonly repository: AuthRepository) {}

  execute(): Promise<PrivacyConsentStatus> {
    return this.repository.acceptPrivacyConsent();
  }
}
