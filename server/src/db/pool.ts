import pg from 'pg';

export type DbPool = pg.Pool;

export function createPool(connectionString: string): DbPool {
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    // Keep idle connections for a minute (pg's default is 10 s). Opening one to a hosted database
    // costs a TLS handshake plus authentication, several network round trips, on the user's request.
    idleTimeoutMillis: 60_000,
    enableChannelBinding: wantsChannelBinding(connectionString),
  });
  // An idle client losing its connection must not crash the process; the next query reconnects.
  // Hosted databases that scale to zero (e.g. Neon) close idle connections when they suspend.
  pool.on('error', (error) => console.error('[db] idle client error:', error.message));
  return pool;
}

/**
 * node-postgres ignores libpq's `channel_binding` URL parameter (Neon's connection strings include
 * `channel_binding=require`), so map it to the driver option: SCRAM-SHA-256-PLUS is then used
 * whenever the server offers it, binding the login to the TLS certificate.
 */
function wantsChannelBinding(connectionString: string): boolean {
  try {
    return new URL(connectionString).searchParams.get('channel_binding') === 'require';
  } catch {
    return false;
  }
}

/** True when `error` is a PostgreSQL unique-constraint violation on the given constraint/index. */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  return error instanceof pg.DatabaseError && error.code === '23505' && error.constraint === constraint;
}
