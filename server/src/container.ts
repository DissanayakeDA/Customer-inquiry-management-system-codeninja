import type { AppConfig } from './config';
import { createPool, type DbPool } from './db/pool';
import { RoleBasedInquiryAccessPolicy } from './domain/access-policy';
import { StatusTransitionPolicy } from './domain/status-transition-policy';
import { SessionCookie } from './http/session-cookie';
import { PgInquiryRepository } from './repositories/pg-inquiry-repository';
import { PgUserRepository } from './repositories/pg-user-repository';
import type { UserRepository } from './repositories/user-repository';
import { BcryptPasswordHasher, type PasswordHasher } from './security/password-hasher';
import { JwtTokenService } from './security/token-service';
import { AuthService } from './services/auth-service';
import { DashboardService } from './services/dashboard-service';
import { InquiryService } from './services/inquiry-service';

export interface AppContainer {
  readonly config: AppConfig;
  readonly pool: DbPool;
  readonly passwordHasher: PasswordHasher;
  readonly sessionCookie: SessionCookie;
  readonly userRepository: UserRepository;
  readonly authService: AuthService;
  readonly inquiryService: InquiryService;
  readonly dashboardService: DashboardService;
  close(): Promise<void>;
}

export interface ContainerOverrides {
  passwordHasher?: PasswordHasher;
}

/**
 * Composition root: the only place that chooses concrete implementations.
 * Everything else depends on interfaces passed in through constructors.
 */
export function createContainer(config: AppConfig, overrides: ContainerOverrides = {}): AppContainer {
  const pool = createPool(config.databaseUrl);

  const passwordHasher = overrides.passwordHasher ?? new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(config.jwtSecret, config.sessionTtlSeconds);

  const userRepository = new PgUserRepository(pool);
  const inquiryRepository = new PgInquiryRepository(pool);

  const accessPolicy = new RoleBasedInquiryAccessPolicy();
  const statusPolicy = new StatusTransitionPolicy();

  return {
    config,
    pool,
    passwordHasher,
    sessionCookie: new SessionCookie(config.secureCookies, config.sessionTtlSeconds * 1000),
    userRepository,
    authService: new AuthService(userRepository, passwordHasher, tokenService),
    inquiryService: new InquiryService(inquiryRepository, userRepository, accessPolicy, statusPolicy),
    dashboardService: new DashboardService(inquiryRepository, accessPolicy),
    close: () => pool.end(),
  };
}
