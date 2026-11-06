/**
 * Teacher guard for route handlers. Kept out of route files: Next only allows
 * handler exports from app/api/**\/route.ts (see lib/adminAuth.ts).
 */
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import type { User } from '@/types/user'

/** Returns the signed-in teacher, or null for anyone else. */
export async function requireTeacher() {
  const session = await getSession()
  if (!session) return null
  const rows = await query<Pick<User, 'id' | 'role'>>('SELECT id, role FROM users WHERE id = ? LIMIT 1', [session.userId])
  if (!rows.length || rows[0].role !== 'teacher') return null
  return rows[0]
}
