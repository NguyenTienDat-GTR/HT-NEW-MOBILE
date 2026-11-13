import { useCallback, useEffect, useState } from 'react';

import { errorMessage } from '@/core/domain/app-error';

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
  const [state, setState] = useState<FlowState>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const secondsToResend = useCountdown(state.resendAt);

  const run = useCallback(async (action: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (exception) {
      setError(errorMessage(exception));
    } finally {
      setPending(false);
    }
  }, []);

  const sendOtp = useCallback(
    (username: string) =>
      run(async () => {
        const trimmed = username.trim();
        const challenge = await deps.requestPasswordResetOtp.execute(trimmed);
        setState({
          ...initial,
          step: 'otp',
          username: trimmed,
          maskedEmail: challenge.maskedEmail,
          resendAt: Date.now() + challenge.resendAfterSeconds * 1000,
        });
      }),
    [deps, run],
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
        setState((current) => ({ ...current, step: 'done' }));
      }),
    [deps, run, state.resetToken, state.username],
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

/** Đếm ngược số giây còn lại tới mốc `targetMs` (0 khi đã qua). */
function useCountdown(targetMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetMs <= 0) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= targetMs) clearInterval(timer);
    };
    // Cập nhật ngay một lần (mốc mới) rồi mỗi giây; tự dừng khi hết giờ.
    const immediate = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(timer);
    };
  }, [targetMs]);

  return Math.max(0, Math.ceil((targetMs - now) / 1000));
}
