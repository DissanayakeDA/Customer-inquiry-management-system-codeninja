import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export interface AppConfig {
  readonly env: 'development' | 'test' | 'production';
  readonly port: number;
  readonly databaseUrl: string;
  readonly jwtSecret: string;
  readonly sessionTtlSeconds: number;
  /** Send the session cookie only over HTTPS. */
  readonly secureCookies: boolean;
}

const DEV_ONLY_SECRET = 'dev-only-insecure-secret-do-not-use-in-production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).default('postgres://postgres:postgres@localhost:5432/inquirydesk'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters.').optional(),
  SESSION_TTL_HOURS: z.coerce.number().positive().max(24 * 30).default(8),
});

/** Loads `.env` from the working directory (if present) into process.env. Existing variables win. */
export function loadDotEnv(file = path.resolve(process.cwd(), '.env')): void {
  if (existsSync(file)) process.loadEnvFile(file);
}

/** Validates environment variables once at startup so misconfiguration fails fast and loudly. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  }
  const values = parsed.data;

  if (values.NODE_ENV === 'production' && !values.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production.');
  }

  return {
    env: values.NODE_ENV,
    port: values.PORT,
    databaseUrl: values.DATABASE_URL,
    jwtSecret: values.JWT_SECRET ?? DEV_ONLY_SECRET,
    sessionTtlSeconds: Math.round(values.SESSION_TTL_HOURS * 3600),
    secureCookies: values.NODE_ENV === 'production',
  };
}
