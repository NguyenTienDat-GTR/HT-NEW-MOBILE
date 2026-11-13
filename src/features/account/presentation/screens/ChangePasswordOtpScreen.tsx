import { useState } from 'react';
import { View } from 'react-native';
import { z } from 'zod';

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/core/domain/password-rules';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { PasswordStrengthMeter } from '@/shared/ui/PasswordStrengthMeter';
import { Screen } from '@/shared/ui/Screen';
import { StepIndicator } from '@/shared/ui/StepIndicator';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import { PASSWORD_CHANGE_STEPS, usePasswordChangeFlow } from '../use-password-change-flow';

const STEP_LABELS = ['Mật khẩu hiện tại', 'Mã OTP', 'Mật khẩu mới'] as const;

const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Mã OTP gồm 6 chữ số');
const newPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Mật khẩu mới tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`)
      .max(PASSWORD_MAX_LENGTH, `Mật khẩu mới tối đa ${PASSWORD_MAX_LENGTH} ký tự`),
    confirmPassword: z.string().min(1, 'Nhập lại mật khẩu mới'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  });

export function ChangePasswordOtpScreen({ onDone }: { onDone: () => void }) {
  const flow = usePasswordChangeFlow();
  const { state } = flow;
  const [oldPassword, setOldPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  function submitOld() {
    if (!oldPassword) return setFieldError({ oldPassword: 'Nhập mật khẩu hiện tại' });
    setFieldError({});
    void flow.sendOtp(oldPassword);
  }

  function submitOtp() {
    const parsed = otpSchema.safeParse(otp);
    if (!parsed.success) return setFieldError({ otp: parsed.error.issues[0]?.message ?? '' });
    setFieldError({});
    void flow.verifyOtp(parsed.data);
  }

  function submitNew() {
    const parsed = newPasswordSchema.safeParse({ newPassword: password, confirmPassword: confirm });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
      return setFieldError(errors);
    }
    setFieldError({});
    void flow.changePassword(parsed.data.newPassword, parsed.data.confirmPassword);
  }

  if (state.step === 'done') {
    return (
      <Screen footer={<Button label="Xong" onPress={onDone} />}>
        <Banner tone="info" message="Đã đổi mật khẩu. Bạn vẫn đang đăng nhập trên máy này." />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          {state.step === 'old' ? (
            <Button label="Gửi mã OTP" onPress={submitOld} loading={flow.pending} />
          ) : null}
          {state.step === 'otp' ? (
            <>
              <Button label="Xác nhận mã" onPress={submitOtp} loading={flow.pending} />
              <Button
                label={
                  flow.secondsToResend > 0
                    ? `Gửi lại mã sau ${flow.secondsToResend}s`
                    : 'Gửi lại mã'
                }
                variant="outline"
                size="sm"
                disabled={flow.secondsToResend > 0 || flow.pending}
                onPress={() => void flow.resendOtp()}
              />
            </>
          ) : null}
          {state.step === 'new' ? (
            <Button label="Đổi mật khẩu" onPress={submitNew} loading={flow.pending} />
          ) : null}
          {state.step !== 'old' ? (
            <Button label="Làm lại từ đầu" variant="ghost" size="sm" onPress={flow.restart} />
          ) : null}
        </>
      }
    >
      <StepIndicator labels={STEP_LABELS} current={PASSWORD_CHANGE_STEPS.indexOf(state.step)} />

      {state.step === 'old' ? (
        <View style={{ gap: 12 }}>
          <Text variant="secondary" tone="muted">
            Nhập mật khẩu hiện tại. Chúng tôi sẽ gửi mã xác thực tới email của tài khoản.
          </Text>
          <TextField
            label="Mật khẩu hiện tại"
            value={oldPassword}
            onChangeText={setOldPassword}
            error={fieldError.oldPassword}
            secure
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="send"
            onSubmitEditing={submitOld}
          />
        </View>
      ) : null}

      {state.step === 'otp' ? (
        <View style={{ gap: 12 }}>
          <Text variant="secondary" tone="muted">
            Nhập mã gồm 6 chữ số vừa gửi tới email {state.maskedEmail}.
          </Text>
          <TextField
            label="Mã OTP"
            value={otp}
            onChangeText={(value) => setOtp(value.replace(/\D/g, ''))}
            error={fieldError.otp}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={submitOtp}
          />
        </View>
      ) : null}

      {state.step === 'new' ? (
        <View style={{ gap: 12 }}>
          <TextField
            label="Mật khẩu mới"
            value={password}
            onChangeText={setPassword}
            error={fieldError.newPassword}
            secure
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
          />
          <PasswordStrengthMeter value={password} />
          <TextField
            label="Nhập lại mật khẩu mới"
            value={confirm}
            onChangeText={setConfirm}
            error={fieldError.confirmPassword}
            secure
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={submitNew}
          />
        </View>
      ) : null}

      {flow.error ? <Banner tone="danger" message={flow.error} /> : null}
    </Screen>
  );
}
