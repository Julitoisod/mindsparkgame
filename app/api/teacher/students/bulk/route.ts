import { NextResponse } from 'next/server'
import { describeDbError, execute, query } from '@/lib/db'
import { getSession, hashPassword } from '@/lib/auth'
import { composeFullName, defaultPasswordFor, generateUsername } from '@/lib/enrollment'
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
 * Body: { classroomId, students: { lastName, firstName, middleName? }[] }
 * Bulk enroll students from the Registrar's official class-list CSV.
 *
 * MindSpark generates the account itself (panel revision, Aug 2026): the
 * username comes from the name via lib/enrollment and the password is
 * username + "123". A username/password column in the file is honoured when
 * present so hand-made lists still import. `full_name` is composed
 * ("First Middle Last") so existing readers keep working. No parent email is
 * collected or notified.
 *
 * Returns the generated credentials so the teacher can export them as CSV.
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

    type Result = {
      row: number
      name: string
      status: 'enrolled' | 'skipped'
      reason?: string
      username?: string
      password?: string
    }
    const results: Result[] = []
    let enrolledCount = 0
    let skippedCount = 0

    // Every username already in use, so generated ones stay unique across the
    // whole system and within this batch.
    const takenRows = await query<{ username: string }>('SELECT username FROM users')
    const taken = new Set(takenRows.map(r => r.username.toLowerCase()))

    for (let i = 0; i < students.length; i++) {
      const raw = students[i] as Record<string, unknown>
      const lastName = String(raw.lastName ?? raw.last_name ?? '').trim().replace(/\s+/g, ' ')
      const firstName = String(raw.firstName ?? raw.first_name ?? '').trim().replace(/\s+/g, ' ')
      const middleName = String(raw.middleName ?? raw.middle_name ?? '').trim().replace(/\s+/g, ' ')
      // Back-compat: accept a single Full Name column and use it as the display name only.
      const legacyFullName = String(raw.fullName ?? raw.full_name ?? raw.name ?? '').trim().replace(/\s+/g, ' ')
      const fullName = composeFullName(firstName, middleName, lastName) ?? (legacyFullName || null)

      if (!firstName && !lastName && !legacyFullName) {
        results.push({ row: i + 1, name: '(empty)', status: 'skipped', reason: 'No student name in this row' })
        skippedCount++
        continue
      }

      // A username column is honoured when the file carries one; otherwise the
      // system generates it from the name (panel revision).
      const providedUsername = String(raw.username ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
      let username: string
      if (providedUsername.length >= 3) {
        if (taken.has(providedUsername)) {
          results.push({ row: i + 1, name: fullName ?? providedUsername, status: 'skipped', reason: 'Username already taken' })
          skippedCount++
          continue
        }
        taken.add(providedUsername)
        username = providedUsername
      } else {
        username = generateUsername(firstName || legacyFullName, lastName, taken)
      }

      // Password from the Registrar file when provided (>= 4 chars); otherwise username + "123".
      const csvPassword = String(raw.password ?? '').trim()
      const password = csvPassword.length >= 4 ? csvPassword : defaultPasswordFor(username)
      // Placeholder email to satisfy the NOT NULL / UNIQUE constraint (no email is sent).
      const email = `${username}@student.mindspark`

      const passwordHash = await hashPassword(password)
      try {
        await execute(
          `INSERT INTO users
             (username, full_name, last_name, first_name, middle_name, email, password_hash, role, enrollment_status, enrolled_by, classroom_id, enrolled_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'student', 'enrolled', ?, ?, NOW())`,
          [username, fullName, lastName || null, firstName || null, middleName || null, email, passwordHash, teacher.id, classroomId],
        )
      } catch (error) {
        console.error('[teacher/students/bulk] insert', error)
        const reason = describeDbError(error, 'Could not create the account')
        // A schema-drift error hits every row identically, so stop rather than
        // hand back 100 identical failures.
        if ((error as { code?: string } | null)?.code === 'ER_BAD_FIELD_ERROR') {
          return NextResponse.json({ success: false, message: reason }, { status: 500 })
        }
        results.push({ row: i + 1, name: fullName ?? username, status: 'skipped', reason })
        skippedCount++
        continue
      }

      results.push({ row: i + 1, name: fullName ?? username, status: 'enrolled', username, password })
      enrolledCount++
    }

    return NextResponse.json({
      success: true,
      message: `${enrolledCount} enrolled, ${skippedCount} skipped`,
      data: { enrolledCount, skippedCount, results, sectionName: classroomRows[0].name },
    })
  } catch (error) {
    console.error('[teacher/students/bulk] POST', error)
    return NextResponse.json(
      { success: false, message: describeDbError(error, 'Bulk enrollment failed') },
      { status: 500 },
    )
  }
}
