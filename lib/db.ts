/**
 * lib/db.ts
 * MySQL2 connection pool using environment variables.
 * Uses a module-level singleton so the pool is reused across hot-reloads in dev.
 */
import mysql from 'mysql2/promise'

declare global {
  // Extend the Node.js global to hold the pool between hot reloads
  var _mysqlPool: mysql.Pool | undefined
}

function createPool(): mysql.Pool {
  return mysql.createPool({
    host:               process.env.DB_HOST     ?? 'localhost',
    port:               parseInt(process.env.DB_PORT ?? '3306', 10),
    user:               process.env.DB_USER     ?? 'root',
    password:           process.env.DB_PASSWORD ?? '',
    database:           process.env.DB_NAME     ?? 'mindsparkgame',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    enableKeepAlive:    true,
    keepAliveInitialDelay: 0,
    timezone:           'Z',
    charset:            'utf8mb4',
  })
}

// Reuse the pool between hot-reloads in development
const pool: mysql.Pool =
  process.env.NODE_ENV === 'production'
    ? createPool()
    : (global._mysqlPool ?? (global._mysqlPool = createPool()))

export default pool

/**
 * Helper: run a parameterised query and return rows typed as T.
 * @example
 * const users = await query<User>('SELECT * FROM users WHERE id = ?', [userId])
 */
export async function query<T = unknown>(
  sql: string,
  params: mysql.ExecuteValues[] = [],
): Promise<T[]> {
  const [rows] = await pool.execute(sql, params)
  return rows as T[]
}

/**
 * Helper: execute a mutating statement (INSERT / UPDATE / DELETE).
 * Returns the ResultSetHeader so you can access insertId, affectedRows, etc.
 */
export async function execute(
  sql: string,
  params: mysql.ExecuteValues[] = [],
): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(sql, params)
  return result as mysql.ResultSetHeader
}

/**
 * Turns a driver error into something the teacher can act on.
 *
 * A missing column or table means a file in database/migrations/ was never
 * applied to THIS database — the most common deploy failure in this project,
 * and the one that used to surface as a bare "Bulk enrollment failed" 500 with
 * no clue as to why. Say what is actually wrong instead.
 */
export function describeDbError(error: unknown, fallback: string): string {
  const code = (error as { code?: string } | null)?.code
  if (code === 'ER_BAD_FIELD_ERROR' || code === 'ER_NO_SUCH_TABLE') {
    return 'The database is out of date — apply database/migrations/ (latest: 2026-08b-revision.sql) to this server, then try again.'
  }
  if (code === 'ER_DUP_ENTRY') return 'That username is already taken.'
  return fallback
}
