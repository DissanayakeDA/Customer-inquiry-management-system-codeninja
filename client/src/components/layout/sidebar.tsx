'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';
import { useSignOut } from '@/hooks/use-session';
import { useCurrentUser } from '../session/session-context';
import { IconDashboard, IconList, IconPlusCircle, IconSignOut } from '../ui/icons';
import { Avatar } from '../ui/primitives';
import { useToast } from '../ui/toast';
import { Brand } from './brand';

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: IconDashboard, isActive: (p) => p === '/dashboard' },
  {
    href: '/inquiries',
    label: 'Inquiries',
    icon: IconList,
    isActive: (p) => p.startsWith('/inquiries') && p !== '/inquiries/new',
  },
  { href: '/inquiries/new', label: 'New inquiry', icon: IconPlusCircle, isActive: (p) => p === '/inquiries/new' },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const signOut = useSignOut();
  const toast = useToast();

  return (
    <aside className="sidebar">
      <Brand />
      <nav className="nav" aria-label="Workspace">
        <div className="nav-label">Workspace</div>
        {NAV_ITEMS.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link key={href} href={href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <Avatar name={user.name} />
        <div className="who">
          <b>{user.name}</b>
          <small>{user.role === 'admin' ? 'Administrator' : 'Agent'}</small>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm sign-out"
          title="Sign out"
          aria-label="Sign out"
          disabled={signOut.isPending}
          onClick={() => signOut.mutate(undefined, { onError: () => toast("Couldn't sign out. Please try again.") })}
        >
          <IconSignOut width={16} height={16} />
        </button>
      </div>
    </aside>
  );
}
