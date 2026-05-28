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
 * Body: { classroomId: number, students: { name, email, password, parentEmail? }[] }
 * Bulk enroll students from CSV upload.
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

    // Verify classroom belongs to teacher
    const classroomRows = await query<{ id: number }>(
      'SELECT id FROM classrooms WHERE id = ? AND teacher_id = ? LIMIT 1',
      [classroomId, teacher.id],
    )
    if (!classroomRows.length) {
      return NextResponse.json({ success: false, message: 'Classroom not found' }, { status: 404 })
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
      const name = String(raw.name ?? '').trim()
      const email = String(raw.email ?? '').trim().toLowerCase()
      const password = String(raw.password ?? '').trim()
      const parentEmail = String(raw.parentEmail ?? raw.parent_email ?? '').trim().toLowerCase() || null

      // Validate
      if (!name || name.length < 2) {
        results.push({ row: i + 1, name: name || '(empty)', status: 'skipped', reason: 'Name too short' })
        skippedCount++
        continue
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ row: i + 1, name, status: 'skipped', reason: 'Invalid email' })
        skippedCount++
        continue
      }
      if (password.length < 6) {
        results.push({ row: i + 1, name, status: 'skipped', reason: 'Password too short (min 6 chars)' })
        skippedCount++
        continue
      }

      // Generate username from name (lowercase, no spaces, add number if taken)
      const baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'student'

      // Check if email already exists
      const existing = await query<{ id: number }>(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [email],
      )
      if (existing.length > 0) {
        results.push({ row: i + 1, name, status: 'skipped', reason: 'Email already registered' })
        skippedCount++
        continue
      }

      // Find unique username
      let username = baseUsername
      let suffix = 1
      while (true) {
        const taken = await query<{ id: number }>(
          'SELECT id FROM users WHERE username = ? LIMIT 1',
          [username],
        )
        if (!taken.length) break
        username = `${baseUsername}${suffix++}`
      }

      const passwordHash = await hashPassword(password)
      await execute(
        `INSERT INTO users
           (username, email, password_hash, role, enrollment_status, enrolled_by, classroom_id, parent_email, enrolled_at)
         VALUES (?, ?, ?, 'student', 'enrolled', ?, ?, ?, NOW())`,
        [username, email, passwordHash, teacher.id, classroomId, parentEmail],
      )

      results.push({ row: i + 1, name, status: 'enrolled' })
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
