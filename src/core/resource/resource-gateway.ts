import type { Page } from '../domain/page';

/** Một dòng dữ liệu của BE (danh sách/chi tiết). Màn hình đọc các trường theo định nghĩa của từng tài nguyên. */
export type ResourceRow = Record<string, unknown>;

/** Tham số danh sách chuẩn của BE (BaseSearchRequest): page từ 0, size 1–100, filters là chuỗi JSON. */
export interface ResourceListQuery {
  page: number;
  size: number;
  search?: string;
  searchFields?: readonly string[];
  status?: boolean;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
  /** Bộ lọc theo đường dẫn trường, ví dụ { "parish.deanery.id": "..." }; giá trị rỗng bị bỏ. */
  filters?: Record<string, string | readonly string[]>;
}

export type HttpVerb = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Cổng CRUD tổng quát cho các tài nguyên có cùng khuôn: danh sách phân trang, chi tiết, tạo, sửa và vài thao tác
 * riêng (xem tác động, bật/tắt, chuyển...). Cài đặt thật dùng HTTP có Bearer; test dùng bản giả.
 */
export interface ResourceGateway {
  list(endpoint: string, query: ResourceListQuery): Promise<Page<ResourceRow>>;
  get(endpoint: string, id: string): Promise<ResourceRow>;
  create(endpoint: string, body: unknown): Promise<ResourceRow>;
  update(endpoint: string, id: string, body: unknown): Promise<ResourceRow>;
  /** Lời gọi tự do cho thao tác riêng của tài nguyên; trả về `data` đã bóc bao ngoài. */
  call<T>(
    method: HttpVerb,
    path: string,
    options?: { body?: unknown; query?: Record<string, string | number | boolean | undefined> },
  ): Promise<T>;
}
