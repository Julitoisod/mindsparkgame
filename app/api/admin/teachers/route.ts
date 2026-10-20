/**
 * Admin — teacher account management (2026-10b revision, item 1).
 *
 * GET  /api/admin/teachers   list every teacher with their section/student counts
 * POST /api/admin/teachers   create a teacher account
 *
 * Admin-only: a teacher hitting these routes gets 403, which is what keeps the
 * two roles' access separate.
 */
import { NextResponse } from 'next/server'
import { describeDbError, execute, hasColumn, query } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { requireAdmin } from '@/lib/adminAuth'

interface TeacherRow {
  id: number
  username: string
  fullName: string | null
  email: string
  isActive: number
  createdAt: string
  sectionCount: number
  studentCount: number
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })

  try {
    const activeColumn = (await hasColumn('users', 'is_active')) ? 'u.is_active' : '1'
    const rows = await query<TeacherRow>(
      `SELECT
         u.id,
         u.username,
         u.full_name AS fullName,
         u.email,
         ${activeColumn} AS isActive,
         u.created_at AS createdAt,
         (SELECT COUNT(*) FROM classrooms c WHERE c.teacher_id = u.id) AS sectionCount,
         (SELECT COUNT(*) FROM users s WHERE s.enrolled_by = u.id AND s.role = 'student') AS studentCount
       FROM users u
       WHERE u.role = 'teacher'
       ORDER BY u.created_at DESC`,
    )
    return NextResponse.json({
      success: true,
      data: rows.map(r => ({ ...r, isActive: Boolean(r.isActive) })),
    })
  } catch (error) {
    console.error('[admin/teachers] GET', error)
    return NextResponse.json(
      { success: false, message: describeDbError(error, 'Could not load teacher accounts') },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const username = String(body.username ?? '').trim()
  const fullName = String(body.fullName ?? '').trim()
  const email = String(body.email ?? '').trim()
  const password = String(body.password ?? '')

  const errors: Record<string, string> = {}
  if (username.length < 3) errors.username = 'Username must be at least 3 characters.'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = 'A valid email is required.'
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    errors.password = 'Password must be at least 8 characters and include a letter and a number.'
  }
  if (Object.keys(errors).length) {
    return NextResponse.json({ success: false, message: Object.values(errors)[0], errors }, { status: 400 })
  }

  const taken = await query<{ id: number }>(
    'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
    [email, username],
  )
  if (taken.length) {
    return NextResponse.json({ success: false, message: 'That username or email is already in use' }, { status: 409 })
  }

  try {
    const keepsPassword = await hasColumn('users', 'initial_password')
    const result = await execute(
      `INSERT INTO users (username, full_name, email, password_hash, ${keepsPassword ? 'initial_password, ' : ''}role, enrollment_status)
       VALUES (?, ?, ?, ?, ${keepsPassword ? '?, ' : ''}'teacher', 'enrolled')`,
      [username, fullName || null, email, await hashPassword(password), ...(keepsPassword ? [password] : [])],
    )
    return NextResponse.json({
      success: true,
      message: 'Teacher account created',
      data: {
        id: result.insertId, username, fullName: fullName || null, email,
        isActive: true, sectionCount: 0, studentCount: 0, createdAt: new Date().toISOString(),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[admin/teachers] POST', error)
    return NextResponse.json(
      { success: false, message: describeDbError(error, 'Could not create that teacher account') },
      { status: 500 },
    )
  }
}
