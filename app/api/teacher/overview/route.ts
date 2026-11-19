/**
 * GET /api/teacher/overview[?classroomId=N] — the teacher Dashboard: totals,
 * the shared learning analytics (proficiency distribution, level performance,
 * learning gaps — Nov 2026b), students who need attention, and recent student
 * activity. Built on lib/classRecord so the numbers match Reports exactly.
 */
import { NextResponse } from 'next/server'
import { describeDbError, query } from '@/lib/db'
import { requireTeacher } from '@/lib/teacherAuth'
import { LEVEL_TITLES, loadClassRecord, loadDashboardExtras } from '@/lib/classRecord'
import { LEVELS, buildAnalytics } from '@/lib/analytics'

const ATTENTION_LIMIT = 6
/** Best-run score (out of 10) at or below which a level needs the teacher's eye. */
const ATTENTION_SCORE = 7

export async function GET(request: Request) {
  const teacher = await requireTeacher()
  if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

  const classroomId = Number(new URL(request.url).searchParams.get('classroomId')) || null
  try {
    const [{ sections }] = await query<{ sections: number }>('SELECT COUNT(*) AS sections FROM classrooms WHERE teacher_id = ?', [teacher.id])
    const { students, completions } = await loadClassRecord(teacher.id, classroomId)
    const { finishedAll, recent } = await loadDashboardExtras(students, completions)
    // Averages over attempted levels only — a level nobody played is not a 0
    const analytics = buildAnalytics(students, LEVEL_TITLES)

    // Lowest best-run level per student, then students who have not started
    const low = students
      .map(s => {
        const weakest = LEVELS.filter(l => s.levels[l].attempts > 0).sort((a, b) => s.levels[a].score - s.levels[b].score)[0]
        return weakest ? { studentId: s.id, name: s.name, level: weakest, score: s.levels[weakest].score } : null
      })
      .filter((row): row is NonNullable<typeof row> => row !== null && row.score <= ATTENTION_SCORE)
      .sort((a, b) => a.score - b.score)
      .map(row => ({ ...row, status: row.score <= 5 ? 'Needs Help' : 'Moderate' }))
    const notStarted = students
      .filter(s => LEVELS.every(l => s.levels[l].attempts === 0))
      .map(s => ({ studentId: s.id, name: s.name, level: null, score: null, status: 'Not Started' }))
    const needsAttention = [...low, ...notStarted].slice(0, ATTENTION_LIMIT)

    return NextResponse.json({
      success: true,
      data: {
        stats: { totalStudents: students.length, sections: Number(sections), classAverage: analytics.classAverage, finishedAll },
        analytics,
        needsAttention,
        recent,
      },
    })
  } catch (error) {
    console.error('[teacher/overview] GET', error)
    return NextResponse.json({ success: false, message: describeDbError(error, 'Could not load the dashboard') }, { status: 500 })
  }
}
