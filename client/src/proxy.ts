import { SESSION_COOKIE_NAME } from '@inquirydesk/shared';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * UX only: visitors without a session cookie go straight to sign-in instead of seeing the workspace
 * shell flash first. This protects nothing by itself. It cannot even tell whether the cookie is
 * valid; the Express API verifies the session on every request and is the real enforcement point.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE_NAME)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/dashboard/:path*', '/inquiries/:path*'],
};
