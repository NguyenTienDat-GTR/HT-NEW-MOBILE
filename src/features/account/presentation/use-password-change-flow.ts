import { useCallback, useState } from 'react';
import { useToast } from '@/shared/ui/Toast';

import { errorMessage } from '@/core/domain/app-error';
import { useCountdown } from '@/shared/hooks/use-countdown';

import { useAccountDependencies } from './account-context';

export type PasswordChangeStep = 'old' | 'otp' | 'new' | 'done';
export const PASSWORD_CHANGE_STEPS: PasswordChangeStep[] = ['old', 'otp', 'new'];

interface FlowState {
  step: PasswordChangeStep;
  oldPassword: string;
  maskedEmail: string;
  changeToken: string;
  resendAt: number;
}

const initial: FlowState = {
  step: 'old',
  oldPassword: '',
  maskedEmail: '',
  changeToken: '',
  resendAt: 0,
};

/** Đổi mật khẩu 3 bước: mật khẩu hiện tại -> OTP qua email -> mật khẩu mới. Mọi kiểm tra chính nằm ở BE. */
export function usePasswordChangeFlow() {
  const deps = useAccountDependencies();
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
    (oldPassword: string) =>
      run(async () => {
        const challenge = await deps.requestPasswordChangeOtp.execute(oldPassword);
        if (state.step === 'otp') toast.success(`Đã gửi lại mã OTP tới ${challenge.email}`);
        setState({
          ...initial,
          step: 'otp',
          oldPassword,
          maskedEmail: challenge.email,
          resendAt: Date.now() + challenge.resendAfterSeconds * 1000,
        });
      }),
    [deps, run, state.step, toast],
  );

  const verifyOtp = useCallback(
    (otp: string) =>
      run(async () => {
        const changeToken = await deps.verifyPasswordChangeOtp.execute(otp);
        setState((current) => ({ ...current, step: 'new', changeToken }));
      }),
    [deps, run],
  );

  const changePassword = useCallback(
    (newPassword: string, confirmPassword: string) =>
      run(async () => {
        await deps.changePasswordWithToken.execute(state.changeToken, newPassword, confirmPassword);
        toast.success('Đổi mật khẩu thành công');
        setState((current) => ({ ...current, step: 'done' }));
      }),
    [deps, run, state.changeToken, toast],
  );

  return {
    state,
    pending,
    error,
    secondsToResend,
    sendOtp,
    resendOtp: () => sendOtp(state.oldPassword),
    verifyOtp,
    changePassword,
    restart: () => {
      setError(null);
      setState(initial);
    },
  };
}
