'use client';

import { formatReference } from '@inquirydesk/shared';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import { useCurrentUser } from '../session/session-context';
import { IconMenu } from '../ui/icons';

function crumbsFor(pathname: string): string[] {
  if (pathname === '/dashboard') return ['Workspace', 'Dashboard'];
  if (pathname === '/inquiries') return ['Workspace', 'Inquiries'];
  if (pathname === '/inquiries/new') return ['Workspace', 'Inquiries', 'New inquiry'];
  const detail = /^\/inquiries\/([^/]+)$/.exec(pathname);
  if (detail) {
    const id = decodeURIComponent(detail[1]!);
    return ['Workspace', 'Inquiries', /^\d+$/.test(id) ? formatReference(Number(id)) : 'Invalid link'];
  }
  return ['Workspace'];
}

export function Topbar({ onToggleMenu }: { onToggleMenu: () => void }) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const crumbs = crumbsFor(pathname);

  return (
    <header className="topbar">
      <button className="btn btn-ghost btn-sm menu-btn" type="button" aria-label="Open menu" onClick={onToggleMenu}>
        <IconMenu width={18} height={18} />
      </button>
      <nav className="crumbs" aria-label="Breadcrumb">
        {crumbs.map((crumb, index) =>
          index === crumbs.length - 1 ? (
            <b key={crumb} aria-current="page">
              {crumb}
            </b>
          ) : (
            <Fragment key={crumb}>
              <span>{crumb}</span>
              <span aria-hidden="true">/</span>
            </Fragment>
          ),
        )}
      </nav>
      <div className="spacer" />
      <span className="role-chip" title="Which inquiries you can see">
        {user.role === 'admin' ? 'Scope: all inquiries' : 'Scope: created by or assigned to me'}
      </span>
      {pathname !== '/inquiries/new' && (
        <Link className="btn btn-primary btn-sm" href="/inquiries/new">
          + New inquiry
        </Link>
      )}
    </header>
  );
}
