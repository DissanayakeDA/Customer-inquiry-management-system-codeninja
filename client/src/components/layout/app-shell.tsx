'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile menu after navigating.
  useEffect(() => setNavOpen(false), [pathname]);

  return (
    <div className={`app${navOpen ? ' nav-open' : ''}`}>
      <Sidebar />
      {navOpen && <div className="scrim" aria-hidden="true" onClick={() => setNavOpen(false)} />}
      <div className="main">
        <Topbar onToggleMenu={() => setNavOpen((open) => !open)} />
        <main className="content" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}
