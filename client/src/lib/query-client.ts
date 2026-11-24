import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { isApiError } from './api';
import { queryKeys } from './query-keys';

/**
 * Data-fetching defaults:
 *  - refetch on window focus, so switching back to a tab shows fresh data (the stale-tab case);
 *  - retry only failures that might succeed next time (network / 5xx), never 4xx;
 *  - any 401 outside the session check means the session expired → back to sign-in.
 */
export function createQueryClient(onSessionExpired: () => void): QueryClient {
  const handleError = (error: unknown, isSessionCheck: boolean) => {
    if (!isSessionCheck && isApiError(error, 'UNAUTHENTICATED')) onSessionExpired();
  };

  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => handleError(error, query.queryKey[0] === queryKeys.session[0]),
    }),
    mutationCache: new MutationCache({
      onError: (error) => handleError(error, false),
    }),
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => isApiError(error) && error.isRetryable && failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
}

let redirecting = false;

/** Full navigation (not client-side) so every cached query from the old session is discarded. */
export function redirectToSignIn(reason: 'expired' | null = 'expired'): void {
  if (redirecting) return;
  redirecting = true;
  const next = window.location.pathname + window.location.search;
  const params = new URLSearchParams({ next });
  if (reason) params.set('reason', reason);
  window.location.assign(`/login?${params.toString()}`);
}
