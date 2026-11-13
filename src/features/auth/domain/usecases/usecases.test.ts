import type { AuthRepository } from '../repositories/auth-repository';

import { ChangeTemporaryPassword, ResetPassword } from './password-usecases';
import { GetCaptchaConfig, Login } from './session-usecases';

const repo = (overrides: Partial<AuthRepository> = {}) => overrides as AuthRepository;

describe('Login', () => {
  it('cắt khoảng trắng tên đăng nhập trước khi gửi', async () => {
    const login = jest.fn().mockResolvedValue({ username: 'ht01' });
    await new Login(repo({ login })).execute({
      username: '  ht01 ',
      password: 'p',
      rememberMe: true,
    });
    expect(login.mock.calls[0][0].username).toBe('ht01');
  });
});

describe('GetCaptchaConfig', () => {
  it('lỗi tải cấu hình thì coi như không bật captcha', async () => {
    const getCaptchaConfig = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(new GetCaptchaConfig(repo({ getCaptchaConfig })).execute()).resolves.toEqual({
      enabled: false,
      siteKey: null,
    });
  });
});

describe('ChangeTemporaryPassword', () => {
  it('từ chối mật khẩu mới trùng mật khẩu cũ hoặc sai độ dài, không gọi BE', async () => {
    const changePassword = jest.fn();
    const useCase = new ChangeTemporaryPassword(repo({ changePassword }));
    await expect(useCase.execute('Abcdef12', 'Abcdef12')).rejects.toMatchObject({
      message: 'Mật khẩu mới phải khác mật khẩu cũ',
    });
    await expect(useCase.execute('old', 'short')).rejects.toMatchObject({ kind: 'validation' });
    await expect(useCase.execute('old', 'x'.repeat(73))).rejects.toMatchObject({
      kind: 'validation',
    });
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('hợp lệ thì gọi repository', async () => {
    const changePassword = jest.fn().mockResolvedValue(undefined);
    await new ChangeTemporaryPassword(repo({ changePassword })).execute('old', 'NewPassw0rd!');
    expect(changePassword).toHaveBeenCalledWith('old', 'NewPassw0rd!');
  });
});

describe('ResetPassword', () => {
  it('yêu cầu nhập lại khớp', async () => {
    const resetPassword = jest.fn();
    await expect(
      new ResetPassword(repo({ resetPassword })).execute({
        username: 'u',
        resetToken: 't',
        newPassword: 'Abcdef12',
        confirmPassword: 'Abcdef13',
      }),
    ).rejects.toMatchObject({ message: 'Mật khẩu nhập lại không khớp' });
    expect(resetPassword).not.toHaveBeenCalled();
  });
});
