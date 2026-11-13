import { FetchHttpClient, serializeQuery } from './fetch-http-client';

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function client(fetchImpl: typeof fetch, timeoutMs = 1000) {
  return new FetchHttpClient({ baseUrl: 'https://api.test/api', timeoutMs, fetchImpl });
}

describe('FetchHttpClient', () => {
  it('bóc `data` khỏi bao ngoài và gửi JSON', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, { success: true, data: { id: 1 } }));
    const result = await client(fetchImpl).request({ method: 'POST', path: '/x', body: { a: 1 } });
    expect(result).toEqual({ id: 1 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.test/api/x');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers['content-type']).toBe('application/json');
  });

  it('lỗi validation: kind=validation, giữ message tiếng Việt và details theo trường', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse(400, {
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
        data: { phone: 'Sai định dạng' },
      }),
    );
    await expect(client(fetchImpl).request({ method: 'GET', path: '/x' })).rejects.toMatchObject({
      kind: 'validation',
      message: 'Dữ liệu không hợp lệ',
      details: { phone: 'Sai định dạng' },
    });
  });

  it.each([
    [401, 'unauthorized', 'Phiên đăng nhập đã hết hạn'],
    [403, 'forbidden', 'Bạn không có quyền thực hiện thao tác này'],
    [404, 'not_found', 'Dữ liệu không còn tồn tại'],
    [409, 'conflict', 'Dữ liệu đã thay đổi, vui lòng tải lại'],
    [429, 'rate_limited', 'Hệ thống đang bận, vui lòng thử lại sau'],
    [500, 'server', 'Không thể hoàn tất yêu cầu'],
  ])('HTTP %i không có message -> %s với câu mặc định', async (status, kind, message) => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(status, null));
    await expect(client(fetchImpl).request({ method: 'GET', path: '/x' })).rejects.toMatchObject({
      kind,
      message,
    });
  });

  it('mất mạng -> kind=network', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(client(fetchImpl).request({ method: 'GET', path: '/x' })).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('quá thời gian chờ -> kind=timeout', async () => {
    const fetchImpl = jest.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    ) as unknown as typeof fetch;
    await expect(
      client(fetchImpl, 20).request({ method: 'GET', path: '/x' }),
    ).rejects.toMatchObject({ kind: 'timeout' });
  });
});

describe('serializeQuery', () => {
  it('lặp tham số mảng, bỏ giá trị rỗng/null và mã hóa ký tự', () => {
    expect(
      serializeQuery({
        page: 0,
        search: 'nguyễn văn',
        empty: '',
        none: null,
        undef: undefined,
        searchFields: ['a', 'b'],
        status: false,
      }),
    ).toBe('page=0&search=nguy%E1%BB%85n%20v%C4%83n&searchFields=a&searchFields=b&status=false');
  });
});
