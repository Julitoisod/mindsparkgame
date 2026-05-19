import { NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import type { User } from '@/types/user'

interface RouteContext {
  params: Promise<{ id: string }>
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

/**
 * POST /api/teacher/students/[id]/unlock-level
 * Body: { levelNumber: number }
 * Teacher unlocks a specific level for a student.
 */
export async function POST(request: Request, ctx: RouteContext) {
  try {
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

    const levelNumber = Number(body.levelNumber)
    if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 5) {
      return NextResponse.json({ success: false, message: 'Level number must be between 1 and 5' }, { status: 422 })
    }

    // Verify the student belongs to this teacher
    const studentRows = await query<{ id: number }>(
      "SELECT id FROM users WHERE id = ? AND enrolled_by = ? AND role = 'student' LIMIT 1",
      [studentId, teacher.id],
    )
    if (!studentRows.length) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 })
    }

    // Insert the unlock (ignore if already exists)
    await execute(
      `INSERT INTO teacher_level_unlocks (student_id, level_number, unlocked_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE unlocked_by = VALUES(unlocked_by), created_at = NOW()`,
      [studentId, levelNumber, teacher.id],
    )

    // Return all unlocked levels for this student
    const unlocks = await query<{ level_number: number }>(
      'SELECT level_number FROM teacher_level_unlocks WHERE student_id = ? ORDER BY level_number ASC',
      [studentId],
    )

    return NextResponse.json({
      success: true,
      message: `Level ${levelNumber} unlocked for student`,
      data: { unlockedLevels: unlocks.map(row => row.level_number) },
    })
  } catch (error) {
    console.error('[teacher/students/unlock-level] POST', error)
    return NextResponse.json({ success: false, message: 'Failed to unlock level' }, { status: 500 })
  }
}

/**
 * DELETE /api/teacher/students/[id]/unlock-level
 * Body: { levelNumber: number }
 * Teacher revokes a level unlock for a student.
 */
export async function DELETE(request: Request, ctx: RouteContext) {
  try {
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

    const levelNumber = Number(body.levelNumber)
    if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 5) {
      return NextResponse.json({ success: false, message: 'Level number must be between 1 and 5' }, { status: 422 })
    }

    // Verify the student belongs to this teacher
    const studentRows = await query<{ id: number }>(
      "SELECT id FROM users WHERE id = ? AND enrolled_by = ? AND role = 'student' LIMIT 1",
      [studentId, teacher.id],
    )
    if (!studentRows.length) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 })
    }

    await execute(
      'DELETE FROM teacher_level_unlocks WHERE student_id = ? AND level_number = ?',
      [studentId, levelNumber],
    )

    // Return remaining unlocked levels
    const unlocks = await query<{ level_number: number }>(
      'SELECT level_number FROM teacher_level_unlocks WHERE student_id = ? ORDER BY level_number ASC',
      [studentId],
    )

    return NextResponse.json({
      success: true,
      message: `Level ${levelNumber} lock restored for student`,
      data: { unlockedLevels: unlocks.map(row => row.level_number) },
    })
  } catch (error) {
    console.error('[teacher/students/unlock-level] DELETE', error)
    return NextResponse.json({ success: false, message: 'Failed to lock level' }, { status: 500 })
  }
}
