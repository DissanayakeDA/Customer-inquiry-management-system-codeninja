import jwt from 'jsonwebtoken';

export interface SessionClaims {
  userId: number;
}

export interface TokenService {
  issue(userId: number): string;
  /** Returns the claims, or null if the token is malformed, tampered with or expired. */
  verify(token: string): SessionClaims | null;
}

/** Signed, short-lived JWTs (HS256). The token only identifies the user; roles are re-read from the DB. */
export class JwtTokenService implements TokenService {
  private static readonly ALGORITHM = 'HS256';

  constructor(
    private readonly secret: string,
    private readonly ttlSeconds: number,
  ) {}

  issue(userId: number): string {
    return jwt.sign({}, this.secret, {
      subject: String(userId),
      expiresIn: this.ttlSeconds,
      algorithm: JwtTokenService.ALGORITHM,
    });
  }

  verify(token: string): SessionClaims | null {
    try {
      // Pin the algorithm so a token signed with "none" or another algorithm is rejected.
      const payload = jwt.verify(token, this.secret, { algorithms: [JwtTokenService.ALGORITHM] });
      if (typeof payload === 'string' || !payload.sub) return null;
      const userId = Number(payload.sub);
      return Number.isInteger(userId) && userId > 0 ? { userId } : null;
    } catch {
      return null;
    }
  }
}
