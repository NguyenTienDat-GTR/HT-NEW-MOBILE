import { useRef } from 'react';
import { Controller } from 'react-hook-form';
import { Linking, View } from 'react-native';

import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { CheckboxRow } from '@/shared/ui/CheckboxRow';
import { LockKeyIcon, UserIcon } from '@/shared/ui/icons';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { TextField, type TextInputHandle } from '@/shared/ui/TextField';
import { useTheme } from '@/shared/theme/theme-provider';

import { TurnstileView } from '../components/TurnstileView';
import { useLoginViewModel } from '../use-login-view-model';

export interface LoginScreenProps {
  onForgotPassword: () => void;
}

export function LoginScreen({ onForgotPassword }: LoginScreenProps) {
  const vm = useLoginViewModel();
  const { colors, iconSize } = useTheme();
  const passwordRef = useRef<TextInputHandle>(null);
  const { control, formState } = vm.form;

  return (
    // Không dùng thanh nút dính đáy: thanh đó bị bàn phím đẩy lên che ô nhập. Các nút nằm cuối nội dung cuộn, bàn phím mở
    // thì cuộn tới ô đang gõ, nút không nổi lên trên bàn phím.
    <Screen>
      <BrandHeader />
      <View style={{ gap: 4 }}>
        <Text variant="title">Đăng nhập</Text>
        <Text variant="secondary" tone="muted">
          Chào mừng bạn đến với hệ thống C-LEAD
        </Text>
      </View>

      {vm.notice ? <Banner tone="info" message={vm.notice} /> : null}

      <Controller
        control={control}
        name="username"
        render={({ field }) => (
          <TextField
            label="Tài khoản"
            placeholder="Nhập tên đăng nhập"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.username?.message}
            leftIcon={<UserIcon size={iconSize.md} color={colors.muted} />}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.password?.message}
            secure
            leftIcon={<LockKeyIcon size={iconSize.md} color={colors.muted} />}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            inputRef={passwordRef}
            onSubmitEditing={vm.submit}
          />
        )}
      />

      <Controller
        control={control}
        name="rememberMe"
        render={({ field }) => (
          <CheckboxRow label="Ghi nhớ đăng nhập" checked={field.value} onChange={field.onChange} />
        )}
      />

      {vm.siteKey ? (
        <TurnstileView
          siteKey={vm.siteKey}
          siteOrigin={vm.siteOrigin}
          onToken={vm.onTurnstileToken}
          resetSignal={vm.turnstileReset}
        />
      ) : null}

      {vm.formError ? <Banner tone="danger" message={vm.formError} /> : null}

      <Button label="Đăng nhập" onPress={vm.submit} loading={vm.submitting} />
      <Button
        label="Quên mật khẩu?"
        variant="ghost"
        size="sm"
        fullWidth={false}
        onPress={onForgotPassword}
      />
      <Button
        label="Chính sách bảo vệ dữ liệu cá nhân"
        variant="ghost"
        size="sm"
        onPress={() => void Linking.openURL(`${vm.siteOrigin}/chinh-sach-bao-mat`)}
      />
    </Screen>
  );
}
