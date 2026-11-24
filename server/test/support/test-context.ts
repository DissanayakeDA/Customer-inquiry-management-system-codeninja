import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../../src/app';
import { loadConfig, loadDotEnv } from '../../src/config';
import { createContainer, type AppContainer } from '../../src/container';
import { Migrator } from '../../src/db/migrator';
import { SEED_PASSWORD, seedUsers } from '../../src/db/seed';
import { BcryptPasswordHasher } from '../../src/security/password-hasher';

const DEFAULT_TEST_DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/inquirydesk_test';

export const ACCOUNTS = {
  admin: 'nimal@inquirydesk.test',
  ayesha: 'ayesha@inquirydesk.test',
  kasun: 'kasun@inquirydesk.test',
} as const;

export type AccountName = keyof typeof ACCOUNTS;
export type Agent = ReturnType<typeof request.agent>;

export interface TestContext {
  app: Express;
  container: AppContainer;
  userId(account: AccountName): number;
  /** A supertest agent that keeps the session cookie between requests, like a browser. */
  signIn(account: AccountName): Promise<Agent>;
  resetInquiries(): Promise<void>;
  close(): Promise<void>;
}

/** The suite drops and recreates the schema, so refuse to run against anything not clearly a test DB. */
function assertIsTestDatabase(url: string): void {
  const name = new URL(url).pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to run API tests against "${name}": TEST_DATABASE_URL must name a database ending in "_test".`);
  }
}

export async function createTestContext(): Promise<TestContext> {
  loadDotEnv();
  const databaseUrl = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  assertIsTestDatabase(databaseUrl);

  const config = loadConfig({ NODE_ENV: 'test', DATABASE_URL: databaseUrl, JWT_SECRET: 'test-only-secret-0123456789' });
  // Fewer bcrypt rounds keep the suite fast; the hashing code path is identical.
  const container = createContainer(config, { passwordHasher: new BcryptPasswordHasher(4) });

  try {
    await container.pool.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  } catch (error) {
    await container.close();
    throw new Error(
      `Cannot reach the test database (${new URL(databaseUrl).host}). Start PostgreSQL with ` +
        `"docker compose up -d" or set TEST_DATABASE_URL. Cause: ${(error as Error).message}`,
    );
  }
  await new Migrator(container.pool).migrate();
  const ids = await seedUsers(container.pool, container.passwordHasher);

  const app = createApp(container);

  return {
    app,
    container,
    userId: (account) => ids.get(ACCOUNTS[account])!,
    async signIn(account) {
      const agent = request.agent(app);
      await agent.post('/api/auth/login').send({ email: ACCOUNTS[account], password: SEED_PASSWORD }).expect(200);
      return agent;
    },
    async resetInquiries() {
      await container.pool.query('TRUNCATE inquiries RESTART IDENTITY');
    },
    close: () => container.close(),
  };
}
