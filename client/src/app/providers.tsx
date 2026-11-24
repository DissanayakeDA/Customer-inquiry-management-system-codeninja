'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { createQueryClient, redirectToSignIn } from '@/lib/query-client';

export function Providers({ children }: { children: ReactNode }) {
  // One client per browser session (created lazily so it is never shared between server requests).
  const [queryClient] = useState(() => createQueryClient(() => redirectToSignIn('expired')));

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
