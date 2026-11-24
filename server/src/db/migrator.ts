import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DbPool } from './pool';

const DEFAULT_MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
/** Arbitrary constant so two processes never migrate at the same time. */
const MIGRATION_LOCK_ID = 727_001;

/**
 * Minimal forward-only migration runner.
 * Applies pending `migrations/*.sql` in filename order and records them in `schema_migrations`,
 * so re-running is a no-op. All pending files run in ONE transaction: they apply together or not at all.
 *
 * The lock is transaction-scoped (`pg_advisory_xact_lock`), not session-scoped (`pg_advisory_lock`).
 * Behind a transaction-mode connection pooler (PgBouncer, Neon's `-pooler` endpoint) consecutive
 * statements outside a transaction may run on different server connections, so a session lock could
 * be taken on one and "released" on another, leaving it held and blocking the next run forever.
 */
export class Migrator {
  constructor(
    private readonly pool: DbPool,
    private readonly directory: string = DEFAULT_MIGRATIONS_DIR,
  ) {}

  async migrate(): Promise<string[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_ID]);
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          name       TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`);

      const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
      const applied = new Set(rows.map((row) => row.name));
      const pending = (await this.migrationFiles()).filter((file) => !applied.has(file));

      for (const file of pending) {
        const sql = await readFile(path.join(this.directory, file), 'utf8');
        try {
          await client.query(sql);
        } catch (error) {
          throw new Error(`Migration ${file} failed: ${(error as Error).message}`, { cause: error });
        }
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      }

      await client.query('COMMIT'); // also releases the advisory lock
      return pending;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  private async migrationFiles(): Promise<string[]> {
    const entries = await readdir(this.directory);
    return entries.filter((name) => name.endsWith('.sql')).sort();
  }
}
