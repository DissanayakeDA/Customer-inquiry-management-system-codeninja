import { SESSION_COOKIE_NAME } from '@inquirydesk/shared';
import type { CookieOptions, Request, Response } from 'express';

/**
 * Owns how the session token travels: an httpOnly cookie (not readable by page scripts, so an
 * XSS bug cannot steal it) with SameSite=Lax (not sent on cross-site POST/PATCH, which blocks CSRF).
 */
export class SessionCookie {
  constructor(
    private readonly secure: boolean,
    private readonly maxAgeMs: number,
  ) {}

  read(req: Request): string | undefined {
    const value: unknown = req.cookies?.[SESSION_COOKIE_NAME];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  write(res: Response, token: string): void {
    res.cookie(SESSION_COOKIE_NAME, token, { ...this.baseOptions(), maxAge: this.maxAgeMs });
  }

  clear(res: Response): void {
    res.clearCookie(SESSION_COOKIE_NAME, this.baseOptions());
  }

  private baseOptions(): CookieOptions {
    return { httpOnly: true, sameSite: 'lax', secure: this.secure, path: '/' };
  }
}
