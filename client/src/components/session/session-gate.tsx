'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useSessionQuery } from '@/hooks/use-session';
import { errorMessage, isApiError } from '@/lib/api';
import { IconWarningCircle } from '../ui/icons';
import { Spinner, StateBlock } from '../ui/primitives';
import { SessionProvider } from './session-context';

/**
 * Renders the workspace only once the API has confirmed who is signed in.
 * This is a UX gate: the API independently rejects every unauthenticated request.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const session = useSessionQuery();
  const router = useRouter();
  const signedOut = isApiError(session.error, 'UNAUTHENTICATED');

  useEffect(() => {
    if (!signedOut) return;
    const next = window.location.pathname + window.location.search;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [signedOut, router]);

  if (session.data && !signedOut) {
    return <SessionProvider user={session.data}>{children}</SessionProvider>;
  }

  if (session.isPending || signedOut) {
    return (
      <div className="full-page">
        <Spinner />
        <span className="muted">Loading your workspace…</span>
      </div>
    );
  }

  return (
    <div className="full-page">
      <div className="card">
        <StateBlock
          icon={<IconWarningCircle width={22} height={22} />}
          title="Couldn't open your workspace"
          action={
            <button className="btn" type="button" onClick={() => void session.refetch()}>
              Try again
            </button>
          }
        >
          {errorMessage(session.error)}
        </StateBlock>
      </div>
    </div>
  );
}
