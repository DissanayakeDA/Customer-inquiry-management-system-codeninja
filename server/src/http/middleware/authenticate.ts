import type { RequestHandler } from 'express';
import { UnauthenticatedError } from '../../domain/errors';
import type { AuthService } from '../../services/auth-service';
import type { SessionCookie } from '../session-cookie';

/**
 * Server-side authentication gate. Every route registered after this middleware requires a valid
 * session; hiding pages in the frontend is only a convenience on top of this.
 */
export function authenticate(auth: AuthService, cookie: SessionCookie): RequestHandler {
  return async (req, res, next) => {
    try {
      req.user = await auth.resolveSession(cookie.read(req));
      next();
    } catch (error) {
      if (error instanceof UnauthenticatedError) cookie.clear(res);
      next(error);
    }
  };
}
