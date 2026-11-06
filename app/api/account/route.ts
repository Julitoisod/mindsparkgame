/**
 * The signed-in user's own account (panel revision, Nov 2026).
 *
 * GET   /api/account   profile for "My Profile" (any role)
 * PATCH /api/account   { fullName?, username?, email? } — "Edit Account
 *                      Information". Teachers and admins only: a student's
 *                      details come from the Registrar list and stay with the
 *                      teacher; a student can only change their password.
 */
import { NextResponse } from 'next/server'
import { describeDbError, execute, query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { emailError, usernameError } from '@/lib/validations'

type AccountRow = {
  id: number
  username: string
  fullName: string | null
  email: string
  role: 'admin' | 'teacher' | 'student'
  createdAt: string
  updatedAt: string
  sectionCount: number
  studentCount: number
}

async function readAccount(userId: number) {
  const rows = await query<AccountRow>(
    `SELECT u.id, u.username, u.full_name AS fullName, u.email, u.role,
            u.created_at AS createdAt, u.updated_at AS updatedAt,
            (SELECT COUNT(*) FROM classrooms c WHERE c.teacher_id = u.id) AS sectionCount,
            (SELECT COUNT(*) FROM users s WHERE s.enrolled_by = u.id AND s.role = 'student') AS studentCount
       FROM users u WHERE u.id = ? LIMIT 1`,
    [userId],
  )
  if (!rows.length) return null
  const row = rows[0]
  return { ...row, sectionCount: Number(row.sectionCount), studentCount: Number(row.studentCount) }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'Not signed in' }, { status: 401 })
  try {
    const account = await readAccount(session.userId)
    if (!account) return NextResponse.json({ success: false, message: 'Account not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: account })
  } catch (error) {
    console.error('[account] GET', error)
    return NextResponse.json({ success: false, message: describeDbError(error, 'Could not load your account') }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'Not signed in' }, { status: 401 })

  const current = await readAccount(session.userId)
  if (!current) return NextResponse.json({ success: false, message: 'Account not found' }, { status: 404 })
  if (current.role === 'student') {
    return NextResponse.json({ success: false, message: 'Ask your teacher to change your account details.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 })
  }

  const updates: string[] = []
  const params: (string | number | null)[] = []

  if (typeof body.fullName === 'string') {
    const fullName = body.fullName.trim().slice(0, 120)
    updates.push('full_name = ?')
    params.push(fullName || null)
  }
  if (typeof body.username === 'string' && body.username.trim() !== current.username) {
    const username = body.username.trim()
    const problem = usernameError(username)
    if (problem) return NextResponse.json({ success: false, message: problem }, { status: 400 })
    const clash = await query<{ id: number }>('SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1', [username, current.id])
    if (clash.length) return NextResponse.json({ success: false, message: 'That username is already taken.' }, { status: 409 })
    updates.push('username = ?')
    params.push(username)
  }
  if (typeof body.email === 'string' && body.email.trim() !== current.email) {
    const email = body.email.trim()
    const problem = emailError(email)
    if (problem) return NextResponse.json({ success: false, message: problem }, { status: 400 })
    const clash = await query<{ id: number }>('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [email, current.id])
    if (clash.length) return NextResponse.json({ success: false, message: 'That email is already in use.' }, { status: 409 })
    updates.push('email = ?')
    params.push(email)
  }

  if (!updates.length) return NextResponse.json({ success: true, message: 'No changes to save', data: current })

  try {
    params.push(current.id)
    await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)
    return NextResponse.json({ success: true, message: 'Account information updated', data: await readAccount(current.id) })
  } catch (error) {
    console.error('[account] PATCH', error)
    return NextResponse.json({ success: false, message: describeDbError(error, 'Could not update your account') }, { status: 500 })
  }
}
