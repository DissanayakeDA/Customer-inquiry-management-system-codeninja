import { loadConfig, loadDotEnv } from '../config';
import { createPool } from '../db/pool';
import { SEED_PASSWORD, SEED_USERS, seedDemoData } from '../db/seed';
import { BcryptPasswordHasher } from '../security/password-hasher';

loadDotEnv();
const config = loadConfig();
if (config.env === 'production') {
  console.error('Refusing to seed demo data in production: seeding deletes all users and inquiries.');
  process.exit(1);
}

const pool = createPool(config.databaseUrl);
try {
  await seedDemoData(pool, new BcryptPasswordHasher());
  console.log('Seeded demo data. Sign in with any of these accounts:');
  for (const user of SEED_USERS) console.log(`  ${user.email.padEnd(26)} ${user.role}`);
  console.log(`  Password for all: ${SEED_PASSWORD}`);
} catch (error) {
  console.error(`Seeding failed: ${(error as Error).message}`);
  console.error('Did you run `npm run db:migrate` first?');
  process.exitCode = 1;
} finally {
  await pool.end();
}
