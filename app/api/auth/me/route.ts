import { NextResponse } from 'next/server'
import { query }          from '@/lib/db'
import { getSession }     from '@/lib/auth'
import type { PublicUser } from '@/types/user'

/**
 * GET /api/auth/me
 * Returns the currently authenticated user or 401.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  }

  const rows = await query<PublicUser>(
    `SELECT
       id, username, email, role,
       enrollment_status AS enrollmentStatus,
       avatar_url, created_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [session.userId],
  )

  if (!rows.length) {
    return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: 'OK', data: rows[0] })
}
