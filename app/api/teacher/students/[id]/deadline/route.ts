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

async function ownsStudent(studentId: number, teacherId: number) {
  const rows = await query<{ id: number }>(
    "SELECT id FROM users WHERE id = ? AND enrolled_by = ? AND role = 'student' LIMIT 1",
    [studentId, teacherId],
  )
  return rows.length > 0
}

async function listDeadlines(studentId: number) {
  const rows = await query<{ level_number: number; due_at: string }>(
    'SELECT level_number, due_at FROM level_deadlines WHERE student_id = ? ORDER BY level_number ASC',
    [studentId],
  )
  return rows.map(r => ({ levelNumber: r.level_number, dueAt: r.due_at }))
}

/** GET /api/teacher/students/[id]/deadline — list a student's per-level deadlines. */
export async function GET(_request: Request, ctx: RouteContext) {
  try {
    const teacher = await requireTeacher()
    if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

    const { id } = await ctx.params
    const studentId = Number(id)
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid student ID' }, { status: 400 })
    }
    if (!(await ownsStudent(studentId, teacher.id))) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { deadlines: await listDeadlines(studentId) } })
  } catch (error) {
    console.error('[teacher/students/deadline] GET', error)
    return NextResponse.json({ success: false, message: 'Failed to load deadlines' }, { status: 500 })
  }
}

/**
 * POST /api/teacher/students/[id]/deadline
 * Body: { levelNumber: number, dueAt: string }  — set/replace a level deadline.
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
    if (!(await ownsStudent(studentId, teacher.id))) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
    }

    const levelNumber = Number(body.levelNumber)
    if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 5) {
      return NextResponse.json({ success: false, message: 'Level must be between 1 and 5' }, { status: 422 })
    }

    const dueRaw = String(body.dueAt ?? '')
    const due = new Date(dueRaw)
    if (Number.isNaN(due.getTime())) {
      return NextResponse.json({ success: false, message: 'Invalid date' }, { status: 422 })
    }
    // MySQL DATETIME format
    const dueAt = due.toISOString().slice(0, 19).replace('T', ' ')

    await execute(
      `INSERT INTO level_deadlines (student_id, level_number, due_at, set_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE due_at = VALUES(due_at), set_by = VALUES(set_by)`,
      [studentId, levelNumber, dueAt, teacher.id],
    )

    return NextResponse.json({ success: true, message: `Deadline set for Level ${levelNumber}`, data: { deadlines: await listDeadlines(studentId) } })
  } catch (error) {
    console.error('[teacher/students/deadline] POST', error)
    return NextResponse.json({ success: false, message: 'Failed to set deadline' }, { status: 500 })
  }
}

/**
 * DELETE /api/teacher/students/[id]/deadline
 * Body: { levelNumber: number } — clear a level deadline.
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
    if (!(await ownsStudent(studentId, teacher.id))) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
    }

    const levelNumber = Number(body.levelNumber)
    if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 5) {
      return NextResponse.json({ success: false, message: 'Level must be between 1 and 5' }, { status: 422 })
    }

    await execute('DELETE FROM level_deadlines WHERE student_id = ? AND level_number = ?', [studentId, levelNumber])

    return NextResponse.json({ success: true, message: `Deadline cleared for Level ${levelNumber}`, data: { deadlines: await listDeadlines(studentId) } })
  } catch (error) {
    console.error('[teacher/students/deadline] DELETE', error)
    return NextResponse.json({ success: false, message: 'Failed to clear deadline' }, { status: 500 })
  }
}
