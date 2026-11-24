import { loadConfig, loadDotEnv } from '../config';
import { createPool } from '../db/pool';
import { Migrator } from '../db/migrator';

loadDotEnv();
const config = loadConfig();
const pool = createPool(config.databaseUrl);

try {
  const applied = await new Migrator(pool).migrate();
  console.log(applied.length ? `Applied migrations: ${applied.join(', ')}` : 'Database schema is up to date.');
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
