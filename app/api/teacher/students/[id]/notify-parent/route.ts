import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { sendProgressEmail } from '@/lib/email'
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
 * POST /api/teacher/students/[id]/notify-parent
 * Manually triggers a progress report email to the student's parent.
 */
export async function POST(_request: Request, ctx: RouteContext) {
  const teacher = await requireTeacher()
  if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

  const { id } = await ctx.params
  const studentId = Number(id)
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return NextResponse.json({ success: false, message: 'Invalid student ID' }, { status: 400 })
  }

  // Verify teacher owns this student
  const studentRows = await query<{ id: number; username: string; email: string; parent_email: string | null; enrolled_by: number }>(
    'SELECT id, username, email, parent_email, enrolled_by FROM users WHERE id = ? AND role = \'student\' LIMIT 1',
    [studentId],
  )

  if (!studentRows.length || studentRows[0].enrolled_by !== teacher.id) {
    return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 })
  }

  const student = studentRows[0]
  if (!student.parent_email) {
    return NextResponse.json({ success: false, message: 'No parent email set for this student' }, { status: 400 })
  }

  // Gather progress data
  const progressRows = await query<{ completed_levels: string | null }>(
    'SELECT completed_levels FROM game_progress WHERE user_id = ? LIMIT 1',
    [studentId],
  )
  const completedLevels: number[] = progressRows[0]?.completed_levels
    ? JSON.parse(progressRows[0].completed_levels)
    : []

  const walletRows = await query<{ stars: number }>(
    'SELECT stars FROM student_wallets WHERE user_id = ? LIMIT 1',
    [studentId],
  )
  const starBalance = Number(walletRows[0]?.stars ?? 0)

  const badgeRows = await query<{ badge_id: string }>(
    'SELECT badge_id FROM student_badges WHERE user_id = ? ORDER BY earned_at ASC',
    [studentId],
  )
  const badges = badgeRows.map(r => r.badge_id)

  const sent = await sendProgressEmail(student.parent_email, student.username, {
    levelsCompleted: completedLevels.length,
    totalLevels: 5,
    starBalance,
    badges,
    accountInfo: {
      username: student.username,
      email: student.email,
    },
  })

  if (sent) {
    return NextResponse.json({ success: true, message: 'Progress email sent to parent' })
  }

  return NextResponse.json({ success: false, message: 'Failed to send email. Check SMTP configuration.' }, { status: 500 })
}
