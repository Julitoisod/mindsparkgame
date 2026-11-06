/**
 * POST /api/account/password  { currentPassword, newPassword }
 *
 * Any signed-in user changes their OWN password — teachers, admins, and (panel
 * revision, Nov 2026) students in the app. The current password is required,
 * and the teacher-visible plain copy (users.initial_password) is cleared: once
 * the student picks a password, nobody else should be able to read it.
 */
import { NextResponse } from 'next/server'
import { describeDbError, execute, hasColumn, query } from '@/lib/db'
import { getSession, hashPassword, verifyPassword } from '@/lib/auth'
import { passwordError } from '@/lib/validations'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'Not signed in' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword) return NextResponse.json({ success: false, message: 'Enter your current password.' }, { status: 400 })
  const problem = passwordError(newPassword)
  if (problem) return NextResponse.json({ success: false, message: problem }, { status: 400 })
  if (newPassword === currentPassword) {
    return NextResponse.json({ success: false, message: 'Choose a password different from your current one.' }, { status: 400 })
  }

  try {
    const rows = await query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [session.userId])
    if (!rows.length) return NextResponse.json({ success: false, message: 'Account not found' }, { status: 404 })
    if (!(await verifyPassword(currentPassword, rows[0].password_hash))) {
      return NextResponse.json({ success: false, message: 'Your current password is incorrect.' }, { status: 403 })
    }

    const clearsCopy = await hasColumn('users', 'initial_password')
    await execute(
      `UPDATE users SET password_hash = ?${clearsCopy ? ', initial_password = NULL' : ''} WHERE id = ?`,
      [await hashPassword(newPassword), session.userId],
    )
    return NextResponse.json({ success: true, message: 'Password changed' })
  } catch (error) {
    console.error('[account/password] POST', error)
    return NextResponse.json({ success: false, message: describeDbError(error, 'Could not change your password') }, { status: 500 })
  }
}
