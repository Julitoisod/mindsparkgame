/**
 * The class record, built once and shared by Reports (/api/teacher/class-record)
 * and the Dashboard (/api/teacher/overview), so both read the SAME best-run
 * numbers (panel revision, Nov 2026).
 *
 * A level's score is the student's best single run out of 10, the category
 * breakdown comes from those same best runs, and Total is out of 50.
 */
import { query } from '@/lib/db'
import { bestRun, runScore, splitRuns, QUESTIONS_PER_PHASE, type RunAttempt } from '@/lib/runs'
import m5 from '@/lib/m5Questions.json'
import { getBadgeById } from '@/lib/badges'

const MAX_LEVEL = 5

/** Each level's lesson title ("Surface Area Builders"…), for dashboards and reports. */
export const LEVEL_TITLES: readonly string[] = m5.levels.map(l => l.title)

export type LevelCell = { score: number; attempts: number; runs: number }

export type ClassRecordRow = {
  id: number
  name: string
  username: string
  section: string | null
  sectionId: number | null
  levels: Record<number, LevelCell>
  categories: Record<string, { correct: number; asked: number }>
  total: number
}

/** A finished run (all 5 boss answers given) — the dashboard's activity feed. */
export type Completion = { studentId: number; name: string; level: number; score: number; at: string }

/** `teacherId` null = every student in the school (the admin's view, Nov 2026b). */
export async function loadClassRecord(teacherId: number | null, classroomId: number | null) {
  const filters: string[] = []
  const studentParams: number[] = []
  if (teacherId) {
    filters.push('AND u.enrolled_by = ?')
    studentParams.push(teacherId)
  }
  if (classroomId) {
    filters.push('AND u.classroom_id = ?')
    studentParams.push(classroomId)
  }

  const students = await query<{ id: number; username: string; fullName: string | null; classroomName: string | null; classroomId: number | null }>(
    `SELECT u.id, u.username, u.full_name AS fullName, c.name AS classroomName, u.classroom_id AS classroomId
       FROM users u
       LEFT JOIN classrooms c ON c.id = u.classroom_id
      WHERE u.role = 'student' ${filters.join(' ')}
      ORDER BY COALESCE(u.last_name, u.full_name, u.username), u.first_name`,
    studentParams,
  )
  if (students.length === 0) return { students: [] as ClassRecordRow[], categories: [] as string[], completions: [] as Completion[] }

  const ids = students.map(s => s.id)
  const placeholders = ids.map(() => '?').join(',')

  // Every answer with its question's category, oldest first
  const attemptRows = await query<{
    id: number
    user_id: number
    level_number: number
    phase: 'normal' | 'boss'
    is_correct: number
    ts: number
    category: string
  }>(
    `SELECT qa.id, qa.user_id, qa.level_number, qa.phase, qa.is_correct,
            UNIX_TIMESTAMP(qa.attempted_at) AS ts,
            COALESCE(qq.category, 'Uncategorized') AS category
       FROM quiz_attempts qa
       LEFT JOIN quiz_questions qq ON CAST(qq.id AS CHAR) = qa.question_id
      WHERE qa.user_id IN (${placeholders})
      ORDER BY qa.id`,
    ids,
  )

  type Answer = RunAttempt & { category: string }
  const byStudentLevel = new Map<string, Answer[]>()
  for (const row of attemptRows) {
    if (row.level_number < 1 || row.level_number > MAX_LEVEL) continue
    const key = `${row.user_id}:${row.level_number}`
    const list = byStudentLevel.get(key) ?? []
    list.push({ id: row.id, phase: row.phase, correct: Number(row.is_correct) === 1, at: Number(row.ts) * 1000, category: row.category })
    byStudentLevel.set(key, list)
  }

  const categorySet = new Set<string>()
  const completions: Completion[] = []
  const rows: ClassRecordRow[] = students.map(s => {
    const name = s.fullName ?? s.username
    const levels: Record<number, LevelCell> = {}
    const byCategory: Record<string, { correct: number; asked: number }> = {}

    for (let level = 1; level <= MAX_LEVEL; level++) {
      const answers = byStudentLevel.get(`${s.id}:${level}`) ?? []
      const runs = splitRuns(answers)
      const best = bestRun(runs) ?? []
      levels[level] = { score: runScore(best), attempts: answers.length, runs: runs.length }

      for (const answer of best) {
        categorySet.add(answer.category)
        const cell = byCategory[answer.category] ?? { correct: 0, asked: 0 }
        byCategory[answer.category] = { correct: cell.correct + (answer.correct ? 1 : 0), asked: cell.asked + 1 }
      }
      for (const run of runs) {
        if (run.filter(a => a.phase === 'boss').length >= QUESTIONS_PER_PHASE) {
          completions.push({ studentId: s.id, name, level, score: runScore(run), at: new Date(run[run.length - 1].at).toISOString() })
        }
      }
    }

    return {
      id: s.id,
      name,
      username: s.username,
      section: s.classroomName,
      sectionId: s.classroomId,
      levels,
      categories: byCategory,
      total: Object.values(levels).reduce((sum, l) => sum + l.score, 0),
    }
  })

  return { students: rows, categories: Array.from(categorySet).sort(), completions }
}

export type StudentActivity = { kind: 'completed' | 'badge'; studentId: number; text: string; detail: string; at: string }

/**
 * Dashboard extras shared by the teacher and admin dashboards (Nov 2026b):
 * how many students finished all five levels (the same completed_levels the
 * Students page shows) and the recent student activity feed.
 */
export async function loadDashboardExtras(students: readonly ClassRecordRow[], completions: readonly Completion[], limit = 6) {
  const ids = students.map(s => s.id)
  if (ids.length === 0) return { finishedAll: 0, recent: [] as StudentActivity[] }
  const placeholders = ids.map(() => '?').join(',')

  const progress = await query<{ user_id: number; completed_levels: string | null }>(
    `SELECT user_id, completed_levels FROM game_progress WHERE user_id IN (${placeholders})`, ids)
  const finishedAll = new Set(
    progress
      .filter(row => {
        try {
          const done = JSON.parse(row.completed_levels ?? '[]')
          return Array.isArray(done) && Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).every(l => done.includes(l))
        } catch { return false }
      })
      .map(row => row.user_id),
  ).size

  const badgeRows = await query<{ user_id: number; badge_id: string; ts: number }>(
    // UNIX_TIMESTAMP: correct whatever the MySQL server's time zone is
    `SELECT user_id, badge_id, UNIX_TIMESTAMP(earned_at) AS ts FROM student_badges WHERE user_id IN (${placeholders}) ORDER BY earned_at DESC LIMIT 20`, ids)
  const nameOf = new Map(students.map(s => [s.id, s.name]))
  const recent: StudentActivity[] = [
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
    .slice(0, limit)

  return { finishedAll, recent }
}
