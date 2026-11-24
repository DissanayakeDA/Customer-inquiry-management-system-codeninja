import { loginSchema, type SessionResponse } from '@inquirydesk/shared';
import type { Request, Response } from 'express';
import { toSessionUser } from '../../domain/user';
import type { AuthService } from '../../services/auth-service';
import { requireUser } from '../request-context';
import type { SessionCookie } from '../session-cookie';
import { parseWith } from '../validation';

export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookie: SessionCookie,
  ) {}

  /** POST /api/auth/login */
  login = async (req: Request, res: Response): Promise<void> => {
    const credentials = parseWith(loginSchema, req.body);
    const { user, token } = await this.auth.signIn(credentials);
    this.cookie.write(res, token);
    res.json({ user: toSessionUser(user) } satisfies SessionResponse);
  };

  /** POST /api/auth/logout — always succeeds, even without a session. */
  logout = (_req: Request, res: Response): void => {
    this.cookie.clear(res);
    res.status(204).end();
  };

  /** GET /api/auth/me */
  me = (req: Request, res: Response): void => {
    res.json({ user: toSessionUser(requireUser(req)) } satisfies SessionResponse);
  };
}
