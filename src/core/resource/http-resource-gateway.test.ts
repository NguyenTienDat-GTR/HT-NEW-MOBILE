import type { HttpClient, HttpRequest } from '../network/http-client';

import { HttpResourceGateway, buildListQuery } from './http-resource-gateway';

describe('buildListQuery', () => {
  it('chỉ gửi searchFields khi có từ khóa; filters thành chuỗi JSON và bỏ giá trị rỗng', () => {
    expect(
      buildListQuery({
        page: 0,
        size: 20,
        search: '  Thánh Tâm ',
        searchFields: ['name', 'chaplain'],
        status: true,
        sortBy: 'name',
        filters: { 'deanery.id': 'D1', unitType: '' },
      }),
    ).toEqual({
      page: 0,
      size: 20,
      search: 'Thánh Tâm',
      searchFields: ['name', 'chaplain'],
      status: true,
      sortBy: 'name',
      sortDirection: 'ASC',
      filters: '{"deanery.id":"D1"}',
    });
    expect(buildListQuery({ page: 1, size: 10, searchFields: ['name'] })).toEqual({
      page: 1,
      size: 10,
    });
  });
});

describe('HttpResourceGateway', () => {
  const make = (data: unknown) => {
    const request = jest.fn().mockResolvedValue(data);
    return { request, gateway: new HttpResourceGateway({ request } as unknown as HttpClient) };
  };

  it('list: chuẩn hóa trang BE, trường thiếu có giá trị mặc định', async () => {
    const { gateway } = make({ content: [{ id: 'a' }], totalElements: 41, number: 1, last: false });
    const page = await gateway.list('/dioceses', { page: 1, size: 20 });
    expect(page).toMatchObject({
      totalElements: 41,
      number: 1,
      last: false,
      first: false,
      size: 20,
    });
    expect(page.content).toEqual([{ id: 'a' }]);
  });

  it('get/create/update gọi đúng đường dẫn và mã hóa id', async () => {
    const { request, gateway } = make({});
    await gateway.get('/leaders', 'a b/c');
    await gateway.create('/leaders', { x: 1 });
    await gateway.update('/leaders', 'L1', { y: 2 });
    const calls = request.mock.calls.map(([r]) => r as HttpRequest);
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/leaders/a%20b%2Fc' });
    expect(calls[1]).toMatchObject({ method: 'POST', path: '/leaders', body: { x: 1 } });
    expect(calls[2]).toMatchObject({ method: 'PUT', path: '/leaders/L1', body: { y: 2 } });
  });
});
