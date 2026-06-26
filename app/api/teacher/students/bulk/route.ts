import { NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { getSession, hashPassword } from '@/lib/auth'
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
 * Body: { classroomId: number, students: { fullName?, username }[] }
 * Bulk enroll students from CSV upload (Full Name + Username).
 * Password is auto-generated as: username + "123".
 * No parent email is collected or notified.
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
      return NextResponse.json({ success: false, message: 'Select a section first' }, { status: 400 })
    }

    // Verify section belongs to teacher
    const classroomRows = await query<{ id: number; name: string }>(
      'SELECT id, name FROM classrooms WHERE id = ? AND teacher_id = ? LIMIT 1',
      [classroomId, teacher.id],
    )
    if (!classroomRows.length) {
      return NextResponse.json({ success: false, message: 'Section not found' }, { status: 404 })
    }

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
      const username = String(raw.username ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
      const fullName = String(raw.fullName ?? raw.full_name ?? raw.name ?? '').trim().replace(/\s+/g, ' ') || null

      // Validate username
      if (!username || username.length < 2) {
        results.push({ row: i + 1, name: fullName || username || '(empty)', status: 'skipped', reason: 'Username too short' })
        skippedCount++
        continue
      }

      // Check if username already taken
      const existingUser = await query<{ id: number }>(
        'SELECT id FROM users WHERE username = ? LIMIT 1',
        [username],
      )
      if (existingUser.length > 0) {
        results.push({ row: i + 1, name: fullName || username, status: 'skipped', reason: 'Username already taken' })
        skippedCount++
        continue
      }

      // Auto-generate password: username + "123"
      const password = `${username}123`
      // Generate a placeholder email to satisfy the NOT NULL / UNIQUE constraint
      const email = `${username}@student.mindspark`

      const passwordHash = await hashPassword(password)
      await execute(
        `INSERT INTO users
           (username, full_name, email, password_hash, role, enrollment_status, enrolled_by, classroom_id, enrolled_at)
         VALUES (?, ?, ?, ?, 'student', 'enrolled', ?, ?, NOW())`,
        [username, fullName, email, passwordHash, teacher.id, classroomId],
      )

      results.push({ row: i + 1, name: fullName || username, status: 'enrolled' })
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
