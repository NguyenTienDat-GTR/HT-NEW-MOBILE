import { pollJob } from './poll-job';

const instant = () => Promise.resolve();

describe('pollJob', () => {
  it('trả ngay khi tác vụ đã xong', async () => {
    const fetchStatus = jest.fn();
    const result = await pollJob({ status: 'DONE' }, fetchStatus, (job) => job.status === 'DONE', {
      sleep: instant,
    });
    expect(result.status).toBe('DONE');
    expect(fetchStatus).not.toHaveBeenCalled();
  });

  it('hỏi lại tới khi xong', async () => {
    const states = [{ status: 'RUNNING' }, { status: 'DONE' }];
    const fetchStatus = jest.fn(async () => states.shift()!);
    const result = await pollJob(
      { status: 'PENDING' },
      fetchStatus,
      (job) => job.status === 'DONE',
      { sleep: instant },
    );
    expect(result.status).toBe('DONE');
    expect(fetchStatus).toHaveBeenCalledTimes(2);
  });

  it('báo lỗi tiếng Việt khi hết số lần hỏi', async () => {
    await expect(
      pollJob(
        { status: 'PENDING' },
        async () => ({ status: 'PENDING' }),
        () => false,
        {
          sleep: instant,
          maxAttempts: 3,
        },
      ),
    ).rejects.toThrow('Quá thời gian chờ xử lý');
  });
});
