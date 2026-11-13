import type { Page } from '../domain/page';
import type { HttpClient } from '../network/http-client';

import type { HttpVerb, ResourceGateway, ResourceListQuery, ResourceRow } from './resource-gateway';

interface PageDto {
  content?: ResourceRow[] | null;
  totalElements?: number | null;
  totalPages?: number | null;
  number?: number | null;
  size?: number | null;
  first?: boolean | null;
  last?: boolean | null;
}

const enc = encodeURIComponent;

/** Dựng query danh sách theo đúng khuôn của BE (xem FE/src/lib/api/search.ts). */
export function buildListQuery(
  query: ResourceListQuery,
): Record<string, string | number | boolean | readonly string[]> {
  const result: Record<string, string | number | boolean | readonly string[]> = {
    page: query.page,
    size: query.size,
  };
  if (query.search?.trim()) {
    result.search = query.search.trim();
    if (query.searchFields?.length) result.searchFields = query.searchFields;
  }
  if (query.status !== undefined) result.status = query.status;
  if (query.sortBy) {
    result.sortBy = query.sortBy;
    result.sortDirection = query.sortDirection ?? 'ASC';
  }
  const filters = Object.fromEntries(
    Object.entries(query.filters ?? {}).filter(([, value]) => value !== ''),
  );
  if (Object.keys(filters).length > 0) result.filters = JSON.stringify(filters);
  return result;
}

export class HttpResourceGateway implements ResourceGateway {
  constructor(private readonly http: HttpClient) {}

  async list(endpoint: string, query: ResourceListQuery): Promise<Page<ResourceRow>> {
    const dto = await this.http.request<PageDto>({
      method: 'GET',
      path: endpoint,
      query: buildListQuery(query),
    });
    const content = dto.content ?? [];
    return {
      content,
      totalElements: dto.totalElements ?? content.length,
      totalPages: dto.totalPages ?? 1,
      number: dto.number ?? query.page,
      size: dto.size ?? query.size,
      first: dto.first ?? query.page === 0,
      last: dto.last ?? true,
    };
  }

  get(endpoint: string, id: string): Promise<ResourceRow> {
    return this.http.request({ method: 'GET', path: `${endpoint}/${enc(id)}` });
  }

  create(endpoint: string, body: unknown): Promise<ResourceRow> {
    return this.http.request({ method: 'POST', path: endpoint, body });
  }

  update(endpoint: string, id: string, body: unknown): Promise<ResourceRow> {
    return this.http.request({ method: 'PUT', path: `${endpoint}/${enc(id)}`, body });
  }

  call<T>(
    method: HttpVerb,
    path: string,
    options: { body?: unknown; query?: Record<string, string | number | boolean | undefined> } = {},
  ): Promise<T> {
    return this.http.request<T>({ method, path, body: options.body, query: options.query });
  }
}
