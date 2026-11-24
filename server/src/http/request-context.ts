import type { Request } from 'express';
import { UnauthenticatedError } from '../domain/errors';
import type { User } from '../domain/user';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by the `authenticate` middleware. */
    user?: User;
  }
}

/** The signed-in user. Throws if a route was wired without the `authenticate` middleware. */
export function requireUser(req: Request): User {
  if (!req.user) throw new UnauthenticatedError();
  return req.user;
}
