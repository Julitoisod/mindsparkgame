/**
 * Admin guard (2026-10b revision, item 1).
 *
 * Lives here rather than in a route file: Next only allows route handlers to
 * be exported from app/api/**\/route.ts, and exporting a helper from one fails
 * the production type check.
 */
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import type { User } from '@/types/user'

/** Returns the signed-in admin, or null for anyone else. */
export async function requireAdmin() {
  const session = await getSession()
  if (!session) return null
  const rows = await query<Pick<User, 'id' | 'role'>>(
    'SELECT id, role FROM users WHERE id = ? LIMIT 1',
    [session.userId],
  )
  if (!rows.length || rows[0].role !== 'admin') return null
  return rows[0]
}
