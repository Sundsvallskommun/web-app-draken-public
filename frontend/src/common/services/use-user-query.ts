import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { getMe, getAdminUsers } from './user-service';

export const useUserQuery = () =>
  useQuery({
    queryKey: queryKeys.user.me,
    queryFn: getMe,
    staleTime: 5 * 60_000,
  });

export const useAdminUsersQuery = () =>
  useQuery({
    queryKey: queryKeys.user.admins,
    queryFn: getAdminUsers,
    staleTime: 10 * 60_000,
  });
