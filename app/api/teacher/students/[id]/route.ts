import { NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { getSession, hashPassword } from '@/lib/auth'
import type { EnrollmentStatus, PublicUser, User } from '@/types/user'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface StudentRow {
  id: number
  username: string
  email: string
  role: 'student'
  enrollmentStatus: EnrollmentStatus
  classroomId: number | null
  classroomName: string | null
  avatar_url: string | null
  parent_email: string | null
  enrolledAt: string | null
  created_at: string
}

async function requireTeacher() {
  const session = await getSession()
  if (!session) return null

  const rows = await query<Pick<User, 'id' | 'role'>>(
    'SELECT id, role FROM users WHERE id = ? LIMIT 1',
    [session.userId],
  )

  if (!rows.length || rows[0].role !== 'teacher') return null
  return rows[0]
}

function publicStudent(row: StudentRow): PublicUser & { enrolledAt: string | null; parentEmail: string | null } {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    enrollmentStatus: row.enrollmentStatus,
    classroomId: row.classroomId,
    classroomName: row.classroomName,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
    enrolledAt: row.enrolledAt,
    parentEmail: row.parent_email,
  }
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const teacher = await requireTeacher()
  if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

  const { id } = await ctx.params
  const studentId = Number(id)
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return NextResponse.json({ success: false, message: 'Invalid student ID' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: string[] = []
  const params: Array<string | number> = []

  if (typeof body.username === 'string') {
    const username = body.username.trim()
    if (username.length < 3 || username.length > 32 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { success: false, message: 'Username must be 3-32 letters, numbers, or underscores.' },
        { status: 422 },
      )
    }
    // Duplicate check
    const dupRows = await query<{ count: number }>(
      'SELECT COUNT(*) AS count FROM users WHERE username = ? AND id != ?',
      [username, studentId],
    )
    if (dupRows[0]?.count > 0) {
      return NextResponse.json({ success: false, message: 'Username already taken' }, { status: 409 })
    }
    updates.push('username = ?')
    params.push(username)
  }

  if (typeof body.enrollmentStatus === 'string') {
    const status = body.enrollmentStatus
    if (!['pending', 'enrolled', 'disabled'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid enrollment status' }, { status: 422 })
    }
    updates.push('enrollment_status = ?')
    params.push(status)
    if (status === 'enrolled') {
      updates.push('enrolled_at = COALESCE(enrolled_at, NOW())')
    }
  }

  if (typeof body.parentEmail === 'string') {
    const parentEmail = body.parentEmail.trim()
    if (parentEmail === '') {
      updates.push('parent_email = NULL')
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      updates.push('parent_email = ?')
      params.push(parentEmail)
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid parent email address' },
        { status: 422 },
      )
    }
  }

  if (typeof body.password === 'string' && body.password.length > 0) {
    if (body.password.length < 8 || !/[a-zA-Z]/.test(body.password) || !/\d/.test(body.password)) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters and include a letter and a number.' },
        { status: 422 },
      )
    }
    updates.push('password_hash = ?')
    params.push(await hashPassword(body.password))
  }

  if (updates.length === 0) {
    return NextResponse.json({ success: false, message: 'No changes provided' }, { status: 400 })
  }

  params.push(studentId, teacher.id)
  const result = await execute(
    `UPDATE users
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = ? AND enrolled_by = ? AND role = 'student'`,
    params,
  )

  if (result.affectedRows === 0) {
    return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 })
  }

  const rows = await query<StudentRow>(
    `SELECT
       u.id,
       u.username,
       u.email,
       u.role,
       u.enrollment_status AS enrollmentStatus,
       u.classroom_id AS classroomId,
       c.name AS classroomName,
       u.avatar_url,
       u.parent_email,
       u.enrolled_at AS enrolledAt,
       u.created_at
     FROM users u
     LEFT JOIN classrooms c ON c.id = u.classroom_id
     WHERE u.id = ? AND u.enrolled_by = ? AND u.role = 'student'
     LIMIT 1`,
    [studentId, teacher.id],
  )

  return NextResponse.json({ success: true, message: 'Student updated', data: publicStudent(rows[0]) })
}
