import type { LoginData } from '@inquirydesk/shared';
import { InvalidCredentialsError, UnauthenticatedError } from '../domain/errors';
import type { User } from '../domain/user';
import type { UserRepository } from '../repositories/user-repository';
import type { PasswordHasher } from '../security/password-hasher';
import type { TokenService } from '../security/token-service';

export interface SignInResult {
  user: User;
  token: string;
}

export class AuthService {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async signIn({ email, password }: LoginData): Promise<SignInResult> {
    const account = await this.users.findCredentialsByEmail(email);
    // Compare against a dummy hash when the email is unknown so the response time
    // does not reveal which emails have accounts.
    const hash = account?.passwordHash ?? (await this.getDummyHash());
    const passwordMatches = await this.hasher.verify(password, hash);
    if (!account || !passwordMatches) throw new InvalidCredentialsError();

    const { passwordHash: _omit, ...user } = account;
    return { user, token: this.tokens.issue(user.id) };
  }

  /**
   * Resolves the user behind a session token. The user is re-loaded from the database on every
   * request, so a deleted account or a changed role takes effect immediately.
   */
  async resolveSession(token: string | undefined): Promise<User> {
    if (!token) throw new UnauthenticatedError();
    const claims = this.tokens.verify(token);
    if (!claims) throw new UnauthenticatedError();
    const user = await this.users.findById(claims.userId);
    if (!user) throw new UnauthenticatedError();
    return user;
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash('timing-equaliser-not-a-real-password');
    return this.dummyHash;
  }
}
