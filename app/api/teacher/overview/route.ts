/**
 * GET /api/teacher/overview[?classroomId=N] — the teacher Dashboard (panel
 * mockup, Nov 2026): totals, class average, students who finished all five
 * levels, average best-run score per level, students who need attention, and
 * recent student activity. Built on lib/classRecord so the numbers match the
 * class record in Reports exactly.
 */
import { NextResponse } from 'next/server'
import { describeDbError, query } from '@/lib/db'
import { requireTeacher } from '@/lib/teacherAuth'
import { loadClassRecord } from '@/lib/classRecord'
import { getBadgeById } from '@/lib/badges'

const LEVELS = [1, 2, 3, 4, 5]
const ATTENTION_LIMIT = 6
/** Best-run score (out of 10) at or below which a level needs the teacher's eye. */
const ATTENTION_SCORE = 7

type Activity = { kind: 'completed' | 'badge'; studentId: number; text: string; detail: string; at: string }

export async function GET(request: Request) {
  const teacher = await requireTeacher()
  if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

  const classroomId = Number(new URL(request.url).searchParams.get('classroomId')) || null
  try {
    const [{ sections }] = await query<{ sections: number }>('SELECT COUNT(*) AS sections FROM classrooms WHERE teacher_id = ?', [teacher.id])
    const { students, completions } = await loadClassRecord(teacher.id, classroomId)
    const ids = students.map(s => s.id)
    const placeholders = ids.map(() => '?').join(',') || 'NULL'

    // "Completed all 5 levels" uses the same completed_levels the Students page shows
    const progress = ids.length
      ? await query<{ user_id: number; completed_levels: string | null }>(
          `SELECT user_id, completed_levels FROM game_progress WHERE user_id IN (${placeholders})`, ids)
      : []
    const finishedAll = new Set(
      progress
        .filter(row => {
          try {
            const done = JSON.parse(row.completed_levels ?? '[]')
            return Array.isArray(done) && LEVELS.every(l => done.includes(l))
          } catch { return false }
        })
        .map(row => row.user_id),
    ).size

    // Averages over attempted levels only — a level nobody played is not a 0
    const played = students.flatMap(s => LEVELS.filter(l => s.levels[l].attempts > 0).map(l => ({ s, l, score: s.levels[l].score })))
    const classAverage = played.length ? Math.round((played.reduce((sum, p) => sum + p.score, 0) / played.length) * 10) : null
    const levelAverages = LEVELS.map(level => {
      const scores = played.filter(p => p.l === level).map(p => p.score)
      return {
        level,
        average: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
        students: scores.length,
      }
    })

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

    const badgeRows = ids.length
      ? await query<{ user_id: number; badge_id: string; ts: number }>(
          // UNIX_TIMESTAMP: correct whatever the MySQL server's time zone is
          `SELECT user_id, badge_id, UNIX_TIMESTAMP(earned_at) AS ts FROM student_badges WHERE user_id IN (${placeholders}) ORDER BY earned_at DESC LIMIT 20`, ids)
      : []
    const nameOf = new Map(students.map(s => [s.id, s.name]))
    const recent: Activity[] = [
      ...completions.map(c => ({
        kind: 'completed' as const, studentId: c.studentId, text: `${c.name} completed Level ${c.level}`, detail: `${c.score}/10`, at: c.at,
      })),
      ...badgeRows.map(b => ({
        kind: 'badge' as const,
        studentId: b.user_id,
        text: `${nameOf.get(b.user_id) ?? 'A student'} earned the ${getBadgeById(b.badge_id)?.name ?? b.badge_id} badge`,
        detail: '',
        at: new Date(Number(b.ts) * 1000).toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 6)

    return NextResponse.json({
      success: true,
      data: {
        stats: { totalStudents: students.length, sections: Number(sections), classAverage, finishedAll },
        levelAverages,
        needsAttention,
        recent,
      },
    })
  } catch (error) {
    console.error('[teacher/overview] GET', error)
    return NextResponse.json({ success: false, message: describeDbError(error, 'Could not load the dashboard') }, { status: 500 })
  }
}
