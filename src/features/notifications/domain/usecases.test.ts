import type { PushGateway } from '@/core/push/push-gateway';

import type { NotificationRepository, PushDeviceRepository } from './repositories';
import { MarkAllNotificationsRead, RegisterPushDevice, UnregisterPushDevice } from './usecases';

describe('MarkAllNotificationsRead', () => {
  it('đánh dấu theo lô 4 (không dồn hết một lúc) và đủ mọi id', async () => {
    let running = 0;
    let peak = 0;
    const markRead = jest.fn(async () => {
      running += 1;
      peak = Math.max(peak, running);
      await Promise.resolve();
      running -= 1;
    });
    const repo = { markRead } as unknown as NotificationRepository;
    await new MarkAllNotificationsRead(repo).execute(Array.from({ length: 10 }, (_, i) => `n${i}`));
    expect(markRead).toHaveBeenCalledTimes(10);
    expect(peak).toBeLessThanOrEqual(4);
  });
});

describe('RegisterPushDevice', () => {
  const deviceId = { get: async () => 'm-dev' };
  const gateway = (registration: Awaited<ReturnType<PushGateway['register']>>) =>
    ({ register: async () => registration, setBadgeCount: async () => {} }) as PushGateway;

  it('có token thì đăng ký thiết bị kèm mã máy và phiên bản app', async () => {
    const register = jest.fn().mockResolvedValue(undefined);
    const ok = await new RegisterPushDevice(
      gateway({ token: 'ExponentPushToken[x]', platform: 'android' }),
      { register, unregister: jest.fn() } as PushDeviceRepository,
      deviceId,
      '1.2.3',
    ).execute();
    expect(ok).toBe(true);
    expect(register).toHaveBeenCalledWith({
      deviceId: 'm-dev',
      pushToken: 'ExponentPushToken[x]',
      platform: 'android',
      appVersion: '1.2.3',
    });
  });

  it('không có token (từ chối quyền, Expo Go, web) thì không gọi BE', async () => {
    const register = jest.fn();
    const ok = await new RegisterPushDevice(
      gateway(null),
      { register, unregister: jest.fn() } as PushDeviceRepository,
      deviceId,
      '1',
    ).execute();
    expect(ok).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it('BE lỗi (chưa hỗ trợ, mất mạng) thì không ném, trả false', async () => {
    const ok = await new RegisterPushDevice(
      gateway({ token: 't', platform: 'ios' }),
      { register: jest.fn().mockRejectedValue(new Error('404')), unregister: jest.fn() },
      deviceId,
      '1',
    ).execute();
    expect(ok).toBe(false);
  });
});

describe('UnregisterPushDevice', () => {
  it('không ném lỗi khi BE không phản hồi', async () => {
    const useCase = new UnregisterPushDevice(
      { register: jest.fn(), unregister: jest.fn().mockRejectedValue(new Error('offline')) },
      { get: async () => 'm-dev' },
    );
    await expect(useCase.execute()).resolves.toBeUndefined();
  });
});
