import { NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { getSession, hashPassword } from '@/lib/auth'
import { sendEnrollmentEmail } from '@/lib/email'
import type { User } from '@/types/user'

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

/**
 * POST /api/teacher/students/bulk
 * Body: { classroomId: number, students: { username, parentEmail? }[] }
 * Bulk enroll students from CSV upload.
 * Password is auto-generated as: username + "123"
 * Parent is notified via email with credentials.
 */
export async function POST(request: Request) {
  try {
    const teacher = await requireTeacher()
    if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
    }

    const classroomId = Number(body.classroomId)
    if (!Number.isInteger(classroomId) || classroomId <= 0) {
      return NextResponse.json({ success: false, message: 'Select a classroom first' }, { status: 400 })
    }

    // Verify classroom belongs to teacher and get its name
    const classroomRows = await query<{ id: number; name: string }>(
      'SELECT id, name FROM classrooms WHERE id = ? AND teacher_id = ? LIMIT 1',
      [classroomId, teacher.id],
    )
    if (!classroomRows.length) {
      return NextResponse.json({ success: false, message: 'Classroom not found' }, { status: 404 })
    }
    const classroomName = classroomRows[0].name

    const students = Array.isArray(body.students) ? body.students : []
    if (students.length === 0) {
      return NextResponse.json({ success: false, message: 'No students provided' }, { status: 400 })
    }
    if (students.length > 100) {
      return NextResponse.json({ success: false, message: 'Maximum 100 students per upload' }, { status: 400 })
    }

    const results: { row: number; name: string; status: 'enrolled' | 'skipped'; reason?: string }[] = []
    let enrolledCount = 0
    let skippedCount = 0

    for (let i = 0; i < students.length; i++) {
      const raw = students[i] as Record<string, unknown>
      const username = String(raw.username ?? raw.name ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
      const parentEmail = String(raw.parentEmail ?? raw.parent_email ?? '').trim().toLowerCase() || null

      // Validate username
      if (!username || username.length < 2) {
        results.push({ row: i + 1, name: username || '(empty)', status: 'skipped', reason: 'Username too short' })
        skippedCount++
        continue
      }

      // Validate parent email if provided
      if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
        results.push({ row: i + 1, name: username, status: 'skipped', reason: 'Invalid parent email' })
        skippedCount++
        continue
      }

      // Check if username already taken
      const existingUser = await query<{ id: number }>(
        'SELECT id FROM users WHERE username = ? LIMIT 1',
        [username],
      )
      if (existingUser.length > 0) {
        results.push({ row: i + 1, name: username, status: 'skipped', reason: 'Username already taken' })
        skippedCount++
        continue
      }

      // Auto-generate password: username + "123"
      const password = `${username}123`
      // Generate a placeholder email to satisfy NOT NULL constraint
      const email = `${username}@student.mindspark`

      const passwordHash = await hashPassword(password)
      await execute(
        `INSERT INTO users
           (username, email, password_hash, role, enrollment_status, enrolled_by, classroom_id, parent_email, enrolled_at)
         VALUES (?, ?, ?, 'student', 'enrolled', ?, ?, ?, NOW())`,
        [username, email, passwordHash, teacher.id, classroomId, parentEmail],
      )

      // Send credentials to parent email
      if (parentEmail) {
        sendEnrollmentEmail(parentEmail, username, password, classroomName).catch(err =>
          console.error(`[bulk] Failed to email parent for ${username}:`, err)
        )
      }

      results.push({ row: i + 1, name: username, status: 'enrolled' })
      enrolledCount++
    }

    return NextResponse.json({
      success: true,
      message: `${enrolledCount} enrolled, ${skippedCount} skipped`,
      data: { enrolledCount, skippedCount, results },
    })
  } catch (error) {
    console.error('[teacher/students/bulk] POST', error)
    return NextResponse.json({ success: false, message: 'Bulk enrollment failed' }, { status: 500 })
  }
}
