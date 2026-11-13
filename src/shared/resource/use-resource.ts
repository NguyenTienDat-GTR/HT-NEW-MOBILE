import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type { ResourceRow } from '@/core/resource/resource-gateway';

import { useResourceGateway } from './resource-context';
import type {
  PermissionSubject,
  FormFieldDef,
  FormMode,
  FormValues,
  OptionsSource,
  ResourceDefinition,
} from './types';

const PAGE_SIZE = 20;

export interface ListState {
  search: string;
  /** undefined = tất cả. */
  status: boolean | undefined;
  filters: Record<string, string>;
}

export const resourceKey = (id: string) => ['resource', id] as const;

/** Danh sách phân trang, cuộn vô hạn; mỗi lần đổi từ khóa/bộ lọc là một truy vấn mới. */
export function useResourceList(def: ResourceDefinition, state: ListState) {
  const gateway = useResourceGateway();
  return useInfiniteQuery({
    queryKey: [...resourceKey(def.id), 'list', state.search, state.status, state.filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      gateway.list(def.endpoint, {
        page: pageParam,
        size: PAGE_SIZE,
        search: state.search,
        searchFields: def.searchFields,
        status: state.status,
        sortBy: def.defaultSort?.by,
        sortDirection: def.defaultSort?.direction,
        filters: { ...state.filters, ...def.baseFilters },
      }),
    getNextPageParam: (last) => (last.last ? undefined : last.number + 1),
  });
}

export function useResourceRow(def: ResourceDefinition, id: string | undefined) {
  const gateway = useResourceGateway();
  return useQuery({
    queryKey: [...resourceKey(def.id), 'row', id],
    queryFn: () => gateway.get(def.endpoint, id as string),
    enabled: Boolean(id),
  });
}

/** Làm mới mọi truy vấn của tài nguyên sau khi tạo/sửa/bật-tắt. */
export function useInvalidateResource(def: ResourceDefinition) {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: resourceKey(def.id) }),
    [queryClient, def.id],
  );
}

export function rowId(def: ResourceDefinition, row: ResourceRow): string {
  return String(row[def.idField ?? 'id'] ?? '');
}

/** Lựa chọn của một trường: tĩnh hoặc tải từ BE, tải lại khi các trường phụ thuộc đổi. */
export function useOptions(
  source: OptionsSource | undefined,
  context: {
    values: FormValues | Record<string, string>;
    mode: FormMode;
    row: ResourceRow | null;
    subject?: PermissionSubject | null;
  },
  keyScope: string,
) {
  const gateway = useResourceGateway();
  const isLoader = source !== undefined && !Array.isArray(source);
  const loader = isLoader ? (source as Exclude<OptionsSource, readonly unknown[]>) : null;
  const deps = useMemo(
    () => (loader?.dependsOn ?? []).map((name) => String(context.values[name] ?? '')),
    [loader, context.values],
  );
  const query = useQuery({
    queryKey: ['resource-options', keyScope, deps],
    queryFn: () =>
      (loader as NonNullable<typeof loader>).load({
        gateway,
        values: context.values as FormValues,
        mode: context.mode,
        row: context.row,
        subject: context.subject ?? null,
      }),
    enabled: loader !== null,
    staleTime: 5 * 60_000,
  });
  return {
    options: loader
      ? (query.data ?? [])
      : ((source ?? []) as readonly { value: string; label: string }[]),
    loading: loader !== null && query.isPending,
  };
}

export function fieldByName(
  fields: readonly FormFieldDef[],
  name: string,
): FormFieldDef | undefined {
  return fields.find((field) => field.name === name);
}
