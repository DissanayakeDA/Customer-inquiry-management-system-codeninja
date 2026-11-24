'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast>(() => undefined);

/** Brief confirmation after a successful action ("INQ-1012 created"). Errors use inline alerts instead. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const show = useCallback<ShowToast>((message) => setToast({ id: Date.now(), message }), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast${toast ? ' show' : ''}`} role="status" aria-live="polite">
        {toast?.message}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
