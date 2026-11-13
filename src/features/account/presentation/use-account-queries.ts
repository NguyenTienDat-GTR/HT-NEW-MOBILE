import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

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
export function useMyPermissions(search: string) {
  const deps = useAccountDependencies();
  return useInfiniteQuery({
    queryKey: ['account', 'permissions', search],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      deps.listMyPermissions.execute(pageParam, PERMISSIONS_PAGE_SIZE, search),
    getNextPageParam: (last) => (last.last ? undefined : last.number + 1),
  });
}
