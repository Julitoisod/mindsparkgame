import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
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
 * GET /api/teacher/attempts
 * Returns quiz session results grouped by student, level, and session.
 * A "session" is a group of attempts within a short time window on the same level.
 */
export async function GET() {
  try {
    const teacher = await requireTeacher()
    if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

    // Get all attempts from students enrolled by this teacher, grouped into sessions
    // A session = same user + same level + attempts within 10 minutes of each other
    const rows = await query<{
      user_id: number
      username: string
      classroom_name: string | null
      level_number: number
      session_date: string
      total_questions: number
      correct_answers: number
      total_score: number
    }>(
      `SELECT
         qa.user_id,
         u.username,
         c.name AS classroom_name,
         qa.level_number,
         DATE_FORMAT(MIN(qa.attempted_at), '%Y-%m-%d %H:%i:%s') AS session_date,
         COUNT(*) AS total_questions,
         SUM(qa.is_correct) AS correct_answers,
         SUM(qa.score_earned) AS total_score
       FROM quiz_attempts qa
       INNER JOIN users u ON u.id = qa.user_id AND u.enrolled_by = ?
       LEFT JOIN classrooms c ON c.id = u.classroom_id
       GROUP BY qa.user_id, qa.level_number, DATE(qa.attempted_at), FLOOR(UNIX_TIMESTAMP(qa.attempted_at) / 600)
       ORDER BY MIN(qa.attempted_at) DESC
       LIMIT 500`,
      [teacher.id],
    )

    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error('[teacher/attempts] GET', error)
    return NextResponse.json({ success: false, message: 'Failed to load attempts' }, { status: 500 })
  }
}
