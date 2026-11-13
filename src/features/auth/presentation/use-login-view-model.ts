import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { errorMessage } from '@/core/domain/app-error';

import { useAuthDependencies } from './auth-context';
import { useAuthStore } from './auth-store';
import { loginSchema, type LoginFormValues } from './forms';

/** Toàn bộ logic màn đăng nhập (form, captcha, gửi). Màn hình chỉ hiển thị. */
export function useLoginViewModel() {
  const deps = useAuthDependencies();
  const notice = useAuthStore((state) => state.notice);

  const captcha = useQuery({
    queryKey: ['auth', 'captcha-config'],
    queryFn: () => deps.getCaptchaConfig.execute(),
    staleTime: Infinity,
  });
  const siteKey = captcha.data?.enabled ? captcha.data.siteKey : null;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', rememberMe: true },
  });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    if (siteKey && !turnstileToken) {
      setFormError('Vui lòng chờ xác minh bảo mật hoàn tất');
      return;
    }
    try {
      const user = await deps.login.execute({
        ...values,
        turnstileToken: turnstileToken ?? undefined,
      });
      useAuthStore.getState().setAuthenticated(user);
    } catch (error) {
      setFormError(errorMessage(error));
      // Token Turnstile chỉ dùng được một lần: bắt xác minh lại sau mỗi lần thất bại.
      setTurnstileToken(null);
      setTurnstileReset((value) => value + 1);
    }
  });

  return {
    form,
    notice,
    formError,
    siteKey,
    siteOrigin: deps.siteOrigin,
    turnstileReset,
    onTurnstileToken: setTurnstileToken,
    submit: () => {
      void submit();
    },
    submitting: form.formState.isSubmitting,
  };
}
