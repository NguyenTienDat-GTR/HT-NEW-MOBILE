import { useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Screen } from '@/shared/ui/Screen';
import { StepIndicator } from '@/shared/ui/StepIndicator';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import { PasswordStrengthMeter } from '@/shared/ui/PasswordStrengthMeter';
import { newPasswordSchema, otpSchema, usernameSchema } from '../forms';
import { FORGOT_STEPS, useForgotPasswordFlow } from '../use-forgot-password-flow';

const STEP_LABELS = ['Tài khoản', 'Mã OTP', 'Mật khẩu mới'] as const;

export interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
}

export function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  const flow = useForgotPasswordFlow();
  const { state } = flow;
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  function submitUsername() {
    const parsed = usernameSchema.safeParse({ username });
    if (!parsed.success) return setFieldError({ username: parsed.error.issues[0]?.message ?? '' });
    setFieldError({});
    void flow.sendOtp(parsed.data.username);
  }

  function submitOtp() {
    const parsed = otpSchema.safeParse({ otp });
    if (!parsed.success) return setFieldError({ otp: parsed.error.issues[0]?.message ?? '' });
    setFieldError({});
    void flow.verifyOtp(parsed.data.otp);
  }

  function submitPassword() {
    const parsed = newPasswordSchema.safeParse({ newPassword: password, confirmPassword: confirm });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
      return setFieldError(errors);
    }
    setFieldError({});
    void flow.resetPassword(parsed.data.newPassword, parsed.data.confirmPassword);
  }

  if (state.step === 'done') {
    return (
      <Screen footer={<Button label="Về trang đăng nhập" onPress={onBackToLogin} />}>
        <Text variant="title">Đặt lại mật khẩu thành công</Text>
        <Banner
          tone="info"
          message="Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới."
        />
      </Screen>
    );
  }

  const stepIndex = FORGOT_STEPS.indexOf(state.step);

  return (
    // Không dùng thanh nút dính đáy: thanh đó bị bàn phím đẩy lên che ô nhập. Nút nằm cuối nội dung cuộn.
    <Screen>
      <Text variant="title">Quên mật khẩu</Text>
      <StepIndicator labels={STEP_LABELS} current={stepIndex} />

      {state.step === 'username' ? (
        <View style={{ gap: 12 }}>
          <Text variant="secondary" tone="muted">
            Nhập tên đăng nhập để nhận mã xác thực qua email.
          </Text>
          <TextField
            label="Tên đăng nhập"
            value={username}
            onChangeText={setUsername}
            error={fieldError.username}
            autoComplete="username"
            textContentType="username"
            returnKeyType="send"
            onSubmitEditing={submitUsername}
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

      {state.step === 'password' ? (
        <View style={{ gap: 12 }}>
          <Text variant="secondary" tone="muted">
            Tạo mật khẩu mới cho tài khoản.
          </Text>
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
            onSubmitEditing={submitPassword}
          />
        </View>
      ) : null}

      {flow.error ? <Banner tone="danger" message={flow.error} /> : null}

      {state.step === 'username' ? (
        <Button label="Gửi mã OTP" onPress={submitUsername} loading={flow.pending} />
      ) : null}
      {state.step === 'otp' ? (
        <>
          <Button label="Xác nhận mã" onPress={submitOtp} loading={flow.pending} />
          <Button
            label={
              flow.secondsToResend > 0 ? `Gửi lại mã sau ${flow.secondsToResend}s` : 'Gửi lại mã'
            }
            variant="outline"
            size="sm"
            disabled={flow.secondsToResend > 0 || flow.pending}
            onPress={() => void flow.resendOtp()}
          />
        </>
      ) : null}
      {state.step === 'password' ? (
        <Button label="Đặt lại mật khẩu" onPress={submitPassword} loading={flow.pending} />
      ) : null}
      <Button
        label={state.step === 'username' ? 'Quay lại đăng nhập' : 'Làm lại từ đầu'}
        variant="ghost"
        size="sm"
        onPress={state.step === 'username' ? onBackToLogin : flow.backToUsername}
      />
    </Screen>
  );
}
