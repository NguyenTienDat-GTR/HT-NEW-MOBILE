import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { errorMessage } from '@/core/domain/app-error';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import { useAuthDependencies } from '../auth-context';
import { useAuthStore } from '../auth-store';
import { PasswordStrengthMeter } from '@/shared/ui/PasswordStrengthMeter';
import { changePasswordSchema, type ChangePasswordFormValues } from '../forms';
import { useLogout } from '../use-session';

/** Bắt buộc đổi mật khẩu tạm do quản trị đặt. BE thu hồi mọi phiên sau khi đổi nên phải đăng nhập lại. */
export function ChangePasswordScreen() {
  const deps = useAuthDependencies();
  const logout = useLogout();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });
  const { control, formState } = form;
  const newPasswordValue = useWatch({ control, name: 'newPassword' });

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await deps.changeTemporaryPassword.execute(values.oldPassword, values.newPassword);
      useAuthStore
        .getState()
        .setAnonymous('Đã đổi mật khẩu. Vui lòng đăng nhập lại bằng mật khẩu mới.');
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  return (
    <Screen
      footer={
        <>
          <Button
            label="Đổi mật khẩu"
            onPress={() => void submit()}
            loading={formState.isSubmitting}
          />
          <Button label="Đăng xuất" variant="ghost" size="sm" onPress={() => void logout()} />
        </>
      }
    >
      <Text variant="title">Đổi mật khẩu</Text>
      <Banner
        tone="warning"
        message="Bạn đang dùng mật khẩu tạm. Hãy đặt mật khẩu mới trước khi tiếp tục."
      />

      <Controller
        control={control}
        name="oldPassword"
        render={({ field }) => (
          <TextField
            label="Mật khẩu hiện tại"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.oldPassword?.message}
            secure
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="next"
          />
        )}
      />
      <Controller
        control={control}
        name="newPassword"
        render={({ field }) => (
          <TextField
            label="Mật khẩu mới"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.newPassword?.message}
            secure
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
          />
        )}
      />
      <PasswordStrengthMeter value={newPasswordValue} />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <TextField
            label="Nhập lại mật khẩu mới"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.confirmPassword?.message}
            secure
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
          />
        )}
      />

      {formError ? <Banner tone="danger" message={formError} /> : null}
    </Screen>
  );
}
