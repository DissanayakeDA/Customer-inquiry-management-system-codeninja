import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { SessionGate } from '@/components/session/session-gate';

/** Every page in this group requires a signed-in staff member. */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGate>
      <AppShell>{children}</AppShell>
    </SessionGate>
  );
}
