import { useCallback, useState } from 'react';
import { useToast } from '@/shared/ui/Toast';

import { errorMessage } from '@/core/domain/app-error';
import { useCountdown } from '@/shared/hooks/use-countdown';

import { useAuthDependencies } from './auth-context';

export type ForgotStep = 'username' | 'otp' | 'password' | 'done';
export const FORGOT_STEPS: ForgotStep[] = ['username', 'otp', 'password'];

interface FlowState {
  step: ForgotStep;
  username: string;
  resetToken: string;
  maskedEmail: string;
  resendAt: number;
}

const initial: FlowState = {
  step: 'username',
  username: '',
  resetToken: '',
  maskedEmail: '',
  resendAt: 0,
};

/** Quên mật khẩu 3 bước: tên đăng nhập -> OTP qua email -> mật khẩu mới. Mọi kiểm tra chính nằm ở BE. */
export function useForgotPasswordFlow() {
  const deps = useAuthDependencies();
  const toast = useToast();
  const [state, setState] = useState<FlowState>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const secondsToResend = useCountdown(state.resendAt);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      setPending(true);
      setError(null);
      try {
        await action();
      } catch (exception) {
        setError(errorMessage(exception));
        toast.error(errorMessage(exception));
      } finally {
        setPending(false);
      }
    },
    [toast],
  );

  const sendOtp = useCallback(
    (username: string) =>
      run(async () => {
        const trimmed = username.trim();
        const challenge = await deps.requestPasswordResetOtp.execute(trimmed);
        // Gửi lại mã (đang ở bước nhập mã) thì báo như web; lần đầu đã có màn nhập mã nên không cần.
        if (state.step === 'otp') toast.success(`Đã gửi lại mã OTP tới ${challenge.maskedEmail}`);
        setState({
          ...initial,
          step: 'otp',
          username: trimmed,
          maskedEmail: challenge.maskedEmail,
          resendAt: Date.now() + challenge.resendAfterSeconds * 1000,
        });
      }),
    [deps, run, state.step, toast],
  );

  const verifyOtp = useCallback(
    (otp: string) =>
      run(async () => {
        const resetToken = await deps.verifyPasswordResetOtp.execute(state.username, otp);
        setState((current) => ({ ...current, step: 'password', resetToken }));
      }),
    [deps, run, state.username],
  );

  const resetPassword = useCallback(
    (newPassword: string, confirmPassword: string) =>
      run(async () => {
        await deps.resetPassword.execute({
          username: state.username,
          resetToken: state.resetToken,
          newPassword,
          confirmPassword,
        });
        toast.success('Đặt lại mật khẩu thành công');
        setState((current) => ({ ...current, step: 'done' }));
      }),
    [deps, run, state.resetToken, state.username, toast],
  );

  return {
    state,
    pending,
    error,
    secondsToResend,
    sendOtp,
    resendOtp: () => sendOtp(state.username),
    verifyOtp,
    resetPassword,
    backToUsername: () => {
      setError(null);
      setState(initial);
    },
  };
}
