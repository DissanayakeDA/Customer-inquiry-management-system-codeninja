'use client';

import type { LoginInput, SessionUser } from '@inquirydesk/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, isApiError } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/** Who is signed in, according to the server (the cookie itself is unreadable from JS by design). */
export function useSessionQuery() {
  return useQuery<SessionUser>({
    queryKey: queryKeys.session,
    queryFn: () => api.auth.me(),
    staleTime: 5 * 60_000,
    retry: (failureCount, error) => isApiError(error) && error.isRetryable && failureCount < 2,
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.auth.signIn(input),
    onSuccess: (user) => queryClient.setQueryData(queryKeys.session, user),
  });
}

export function useSignOut() {
  return useMutation({
    mutationFn: () => api.auth.signOut(),
    // Full page load: drops every cached query belonging to this user.
    onSuccess: () => window.location.assign('/login'),
  });
}
