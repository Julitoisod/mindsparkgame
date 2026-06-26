import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { buildRecommendation, proficiencyFromAccuracy, type CategoryStat } from '@/lib/proficiency'
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
 * GET /api/teacher/students/[id]/insight
 * Per-lesson (category) accuracy, an overall proficiency band, the weakest
 * lessons, and a plain-language recommendation (reqs #11, #13, #14).
 */
export async function GET(_request: Request, ctx: RouteContext) {
  try {
    const teacher = await requireTeacher()
    if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

    const { id } = await ctx.params
    const studentId = Number(id)
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid student ID' }, { status: 400 })
    }

    // Ownership check
    const owned = await query<{ id: number }>(
      "SELECT id FROM users WHERE id = ? AND enrolled_by = ? AND role = 'student' LIMIT 1",
      [studentId, teacher.id],
    )
    if (!owned.length) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 })
    }

    // Per-category accuracy — join attempts to the question bank by id.
    // Legacy attempts (non-numeric question_id) cast to 0 and won't match.
    const rows = await query<{ category: string; level_number: number; total: number; correct: number }>(
      `SELECT qq.category, qq.level_number,
              COUNT(*) AS total,
              SUM(qa.is_correct) AS correct
       FROM quiz_attempts qa
       JOIN quiz_questions qq ON qq.id = CAST(qa.question_id AS UNSIGNED)
       WHERE qa.user_id = ?
       GROUP BY qq.category, qq.level_number
       ORDER BY qq.level_number ASC, qq.category ASC`,
      [studentId],
    )

    const categories: CategoryStat[] = rows.map(r => {
      const total = Number(r.total)
      const correct = Number(r.correct)
      return {
        category: r.category,
        levelNumber: r.level_number,
        correct,
        total,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      }
    })

    const totalCorrect = categories.reduce((s, c) => s + c.correct, 0)
    const totalAnswered = categories.reduce((s, c) => s + c.total, 0)
    const overall = proficiencyFromAccuracy(totalCorrect, totalAnswered)

    const weakLessons = [...categories].sort((a, b) => a.accuracy - b.accuracy)
    const recommendation = buildRecommendation(overall, weakLessons)

    return NextResponse.json({
      success: true,
      data: {
        overall,
        categories,
        weakLessons: weakLessons.filter(c => c.total >= 2 && c.accuracy < 60).slice(0, 3),
        recommendation,
      },
    })
  } catch (error) {
    console.error('[teacher/students/insight] GET', error)
    return NextResponse.json({ success: false, message: 'Failed to load insight' }, { status: 500 })
  }
}
