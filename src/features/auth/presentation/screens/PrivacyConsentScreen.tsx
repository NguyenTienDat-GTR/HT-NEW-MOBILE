import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Linking } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { CheckboxRow } from '@/shared/ui/CheckboxRow';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

import { useAuthDependencies } from '../auth-context';
import { PRIVACY_CONSENT_QUERY_KEY } from '../use-privacy-consent';
import { useLogout } from '../use-session';

/** Cổng đồng ý chính sách bảo vệ dữ liệu cá nhân sau đăng nhập (chưa đồng ý hoặc đã rút thì chặn tới khi tích đồng ý). */
export function PrivacyConsentScreen() {
  const deps = useAuthDependencies();
  const queryClient = useQueryClient();
  const logout = useLogout();
  const [checked, setChecked] = useState(false);
  const [showError, setShowError] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    if (!checked) {
      setShowError(true);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const status = await deps.acceptPrivacyConsent.execute();
      queryClient.setQueryData(PRIVACY_CONSENT_QUERY_KEY, status);
    } catch (exception) {
      setError(errorMessage(exception));
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <Button label="Đồng ý và tiếp tục" onPress={() => void accept()} loading={pending} />
          <Button label="Đăng xuất" variant="ghost" size="sm" onPress={() => void logout()} />
        </>
      }
    >
      <Text variant="title">Chính sách bảo vệ dữ liệu cá nhân</Text>
      <Text variant="secondary" tone="textSecondary">
        Để tiếp tục sử dụng C-LEAD, bạn cần đọc và đồng ý với chính sách xử lý dữ liệu cá nhân hiện
        hành.
      </Text>
      <Button
        label="Đọc chính sách"
        variant="outline"
        size="sm"
        onPress={() => void Linking.openURL(`${deps.siteOrigin}/chinh-sach-bao-mat`)}
      />
      <CheckboxRow
        label="Tôi đã đọc và đồng ý với chính sách bảo vệ dữ liệu cá nhân"
        checked={checked}
        onChange={(value) => {
          setChecked(value);
          setShowError(false);
        }}
        error={showError ? 'Cần đồng ý để tiếp tục' : undefined}
      />
      {error ? <Banner tone="danger" message={error} /> : null}
    </Screen>
  );
}
