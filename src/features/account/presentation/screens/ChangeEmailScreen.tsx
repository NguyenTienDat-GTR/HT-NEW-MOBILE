import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { errorMessage } from '@/core/domain/app-error';
import { useTheme } from '@/shared/theme/theme-provider';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { EnvelopeSimpleIcon } from '@/shared/ui/icons';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import { useAccountDependencies } from '../account-context';
import { MY_PROFILE_QUERY_KEY } from '../use-account-queries';

const schema = z.object({
  email: z
    .string()
    .trim()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email không hợp lệ'),
  currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
});
type Values = z.infer<typeof schema>;

export interface ChangeEmailScreenProps {
  currentEmail?: string | null;
  onDone: () => void;
}

export function ChangeEmailScreen({ currentEmail, onDone }: ChangeEmailScreenProps) {
  const deps = useAccountDependencies();
  const queryClient = useQueryClient();
  const { colors, iconSize } = useTheme();
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { control, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', currentPassword: '' },
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await deps.changeMyEmail.execute(values.email, values.currentPassword);
      await queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY });
      setSaved(true);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  if (saved) {
    return (
      <Screen footer={<Button label="Xong" onPress={onDone} />}>
        <Banner tone="info" message="Đã đổi email nhận thông tin tài khoản." />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button label="Lưu email" onPress={() => void submit()} loading={formState.isSubmitting} />
      }
    >
      <Text variant="secondary" tone="textSecondary">
        Email này dùng để nhận mã xác thực và thông tin đăng nhập.
        {currentEmail ? ` Hiện tại: ${currentEmail}.` : ''}
      </Text>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label="Email mới"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.email?.message}
            leftIcon={<EnvelopeSimpleIcon size={iconSize.md} color={colors.muted} />}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
          />
        )}
      />
      <Controller
        control={control}
        name="currentPassword"
        render={({ field }) => (
          <TextField
            label="Mật khẩu hiện tại"
            hint="Nhập mật khẩu để xác nhận bạn là chủ tài khoản."
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.currentPassword?.message}
            secure
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
          />
        )}
      />
      {formError ? <Banner tone="danger" message={formError} /> : null}
    </Screen>
  );
}
