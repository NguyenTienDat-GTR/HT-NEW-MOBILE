import { useQuery } from '@tanstack/react-query';

import { useAuthDependencies } from './auth-context';

export const PRIVACY_CONSENT_QUERY_KEY = ['auth', 'privacy-consent'] as const;

/**
 * Trạng thái đồng ý chính sách. Không tải được (mất mạng, BE cũ) thì KHÔNG chặn người dùng:
 * BE vẫn là nơi lưu bằng chứng và kiểm soát các form (giống web).
 */
export function usePrivacyConsentGate(enabled: boolean): {
  loading: boolean;
  mustConsent: boolean;
} {
  const deps = useAuthDependencies();
  const query = useQuery({
    queryKey: PRIVACY_CONSENT_QUERY_KEY,
    queryFn: () => deps.getPrivacyConsent.execute(),
    enabled,
    retry: false,
  });
  return {
    loading: enabled && query.isPending,
    mustConsent: Boolean(query.data && !query.data.consented),
  };
}
