import type { AuthRepository } from '../repositories/auth-repository';

import { Logout } from './session-usecases';

describe('Logout', () => {
  it('chạy hook (hủy push) trước khi hủy phiên, theo đúng thứ tự', async () => {
    const order: string[] = [];
    const repo = {
      logout: jest.fn(async () => void order.push('repo')),
    } as unknown as AuthRepository;
    await new Logout(repo, [async () => void order.push('hook')]).execute();
    expect(order).toEqual(['hook', 'repo']);
  });

  it('hook lỗi không chặn đăng xuất', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    const repo = { logout } as unknown as AuthRepository;
    await new Logout(repo, [() => Promise.reject(new Error('offline'))]).execute();
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
