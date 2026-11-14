import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { MyPermissionFilters } from '../domain/entities';

import { useAccountDependencies } from './account-context';

export const MY_PROFILE_QUERY_KEY = ['account', 'profile'] as const;
const PERMISSIONS_PAGE_SIZE = 20;

/** Hồ sơ của tài khoản đang đăng nhập. Cache được xóa khi đăng xuất nên không lẫn giữa các tài khoản. */
export function useMyProfile() {
  const deps = useAccountDependencies();
  return useQuery({
    queryKey: MY_PROFILE_QUERY_KEY,
    queryFn: () => deps.getMyProfile.execute(),
    staleTime: 5 * 60_000,
  });
}

/** Quyền đang có của tài khoản (có tìm kiếm), cuộn vô hạn. */
export function useMyPermissions(search: string, filters: MyPermissionFilters = {}) {
  const deps = useAccountDependencies();
  return useInfiniteQuery({
    queryKey: ['account', 'permissions', search, filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      deps.listMyPermissions.execute(pageParam, PERMISSIONS_PAGE_SIZE, search, filters),
    getNextPageParam: (last) => (last.last ? undefined : last.number + 1),
  });
}

/** Giá trị cho ô lọc phân hệ / hành động của màn Quyền của tôi. */
export function useMyPermissionFilterOptions() {
  const deps = useAccountDependencies();
  return useQuery({
    queryKey: ['account', 'permissions', 'filter-options'],
    queryFn: () => deps.getMyPermissionFilterOptions.execute(),
    staleTime: 5 * 60_000,
  });
}
