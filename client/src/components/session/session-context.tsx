'use client';

import type { SessionUser } from '@inquirydesk/shared';
import { createContext, useContext, type ReactNode } from 'react';

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({ user, children }: { user: SessionUser; children: ReactNode }) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

/** The signed-in staff member. Only usable below <SessionGate>, which guarantees one exists. */
export function useCurrentUser(): SessionUser {
  const user = useContext(SessionContext);
  if (!user) throw new Error('useCurrentUser() must be used inside <SessionGate>.');
  return user;
}
