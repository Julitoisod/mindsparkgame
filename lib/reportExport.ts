/**
 * Reports module — the numbers the Reports page shows AND the full
 * "Download Report" file (panel revision, Nov 2026b: "generate ALL the report
 * modules, not just the student records"). One source, so the file always
 * matches the screen.
 *
 * Pure (proficiency bands only) — checked by `node scripts/check-report-export.mts`.
 */
import { buildRecommendation, proficiencyFromAccuracy } from './proficiency'

const LEVELS = [1, 2, 3, 4, 5]

export type ReportQuizScore = { levelNumber: number; totalAttempts: number; correctAttempts: number; totalScore: number }
export type ReportStudent = {
  id: number
  username: string
  classroomName: string | null
  progress: { levelsCompleted: number; totalLevels: number; starBalance: number; performanceColor: 'none' | 'green' | 'yellow' | 'red' }
  quizScores: ReportQuizScore[]
}
export type ReportSession = {
  user_id: number
  username: string
  classroom_name: string | null
  level_number: number
  session_date: string
  total_questions: number
  correct_answers: number
  total_score: number
}
export type ReportRecordRow = {
  name: string
  username: string
  section: string | null
  levels: Record<number, { score: number; attempts: number }>
  categories: Record<string, { correct: number; asked: number }>
  total: number
}

const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0)

/** Summary cards, distribution, level completion and intervention groups. */
export function reportSummary(students: readonly ReportStudent[]) {
  const total = students.length
  const count = (color: ReportStudent['progress']['performanceColor']) => students.filter(s => s.progress.performanceColor === color).length
  const green = count('green')
  const yellow = count('yellow')
  const red = count('red')
  const none = count('none')
  return {
    total, green, yellow, red, none,
    completionRate: pct(green, total),
    activeRate: pct(total - none, total),
    needsAttention: red + yellow,
    levelCompletion: LEVELS.map(level => {
      const completed = students.filter(s => s.progress.levelsCompleted >= level).length
      return { level, completed, pct: pct(completed, total) }
    }),
  }
}

/** One row of "Student Performance & Intervention Status". */
export function studentPerformance(student: ReportStudent) {
  const scores = student.quizScores ?? []
  const correct = scores.reduce((sum, q) => sum + q.correctAttempts, 0)
  const attempts = scores.reduce((sum, q) => sum + q.totalAttempts, 0)
  const proficiency = proficiencyFromAccuracy(correct, attempts)
  return {
    correct,
    attempts,
    accuracy: pct(correct, attempts),
    points: scores.reduce((sum, q) => sum + q.totalScore, 0),
    proficiency,
    recommendation: buildRecommendation(proficiency, []),
  }
}

const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
const line = (cols: (string | number)[]) => cols.map(escape).join(',')

/**
 * Every Reports module in one CSV (opens in Excel), each under its own heading:
 * summary, performance distribution, level completion, intervention groups,
 * student performance, class record, scores per level, and every quiz attempt.
 */
export function buildFullReportCsv(input: {
  students: readonly ReportStudent[]
  sessions: readonly ReportSession[]
  record: { students: readonly ReportRecordRow[]; categories: readonly string[] }
  scopeLabel: string
  generatedAt: Date
}): string {
  const { students, sessions, record } = input
  const s = reportSummary(students)
  const out: string[] = []
  const section = (title: string) => { out.push('', line([title])) }

  out.push(line(['MindSpark Math — Class Report']))
  out.push(line(['Scope', input.scopeLabel]))
  out.push(line(['Generated', input.generatedAt.toLocaleString()]))

  section('1. SUMMARY')
  out.push(line(['Total Students', s.total]))
  out.push(line(['Completion Rate', `${s.completionRate}%`, `${s.green}/${s.total} students`]))
  out.push(line(['Active Rate', `${s.activeRate}%`, `${s.total - s.none} active`]))
  out.push(line(['Needs Attention', s.needsAttention, `${pct(s.needsAttention, s.total)}% of total`]))

  section('2. PERFORMANCE DISTRIBUTION')
  out.push(line(['Group', 'Students', 'Percent']))
  for (const [label, n] of [['Good (3+ levels)', s.green], ['Average (1-2 levels)', s.yellow], ['Needs Help', s.red], ['Not Started', s.none]] as const) {
    out.push(line([label, n, `${pct(n, s.total)}%`]))
  }

  section('3. LEVEL COMPLETION OVERVIEW')
  out.push(line(['Level', 'Students Completed', 'Percent']))
  for (const l of s.levelCompletion) out.push(line([`Level ${l.level}`, l.completed, `${l.pct}%`]))

  section('4. INTERVENTION SUMMARY')
  out.push(line(['Group', 'Students', 'Percent', 'Meaning']))
  out.push(line(['Needing Immediate Intervention', s.red, `${pct(s.red, s.total)}%`, 'Started but 0 levels completed']))
  out.push(line(['Needing Support', s.yellow, `${pct(s.yellow, s.total)}%`, '1-2 levels completed']))
  out.push(line(['Performing Well', s.green, `${pct(s.green, s.total)}%`, '3+ levels completed']))

  section('5. STUDENT PERFORMANCE & INTERVENTION STATUS')
  out.push(line(['Student', 'Section', 'Levels', 'Stars', 'Quiz Accuracy', 'Points', 'Proficiency', 'Recommendation']))
  for (const st of students) {
    const p = studentPerformance(st)
    out.push(line([
      st.username, st.classroomName ?? '—', `${st.progress.levelsCompleted}/${st.progress.totalLevels}`, st.progress.starBalance,
      p.attempts > 0 ? `${p.correct}/${p.attempts} (${p.accuracy}%)` : '—', p.points || '—', p.proficiency.band, p.recommendation,
    ]))
  }

  section('6. CLASS RECORD (best run per level, out of 10; total out of 50)')
  out.push(line(['Student Name', 'Username', 'Section', ...LEVELS.map(l => `L${l}`), 'Total (/50)', ...record.categories.map(c => `${c} (correct/total)`)]))
  for (const r of record.students) {
    out.push(line([
      r.name, r.username, r.section ?? '',
      ...LEVELS.map(l => (r.levels[l]?.attempts ? r.levels[l].score : '—')),
      r.total,
      ...record.categories.map(c => (r.categories[c] ? `${r.categories[c].correct}/${r.categories[c].asked}` : '—')),
    ]))
  }
  const played = (l: number) => record.students.filter(r => (r.levels[l]?.attempts ?? 0) > 0)
  out.push(line(['Class average', '', '', ...LEVELS.map(l => {
    const rows = played(l)
    return rows.length ? Math.round((rows.reduce((sum, r) => sum + r.levels[l].score, 0) / rows.length) * 10) / 10 : '—'
  })]))

  section('7. SCORES PER LEVEL (all attempts)')
  out.push(line(['Student', 'Section', ...LEVELS.map(l => `Level ${l}`), 'Total Points']))
  for (const st of students) {
    const byLevel = new Map((st.quizScores ?? []).map(q => [q.levelNumber, q]))
    out.push(line([
      st.username, st.classroomName ?? '—',
      ...LEVELS.map(l => {
        const q = byLevel.get(l)
        return q && q.totalAttempts > 0 ? `${q.correctAttempts}/${q.totalAttempts} (${pct(q.correctAttempts, q.totalAttempts)}%, ${q.totalScore}pt)` : '—'
      }),
      studentPerformance(st).points || '—',
    ]))
  }

  section('8. QUIZ ATTEMPTS & SCORES')
  out.push(line(['Student', 'Section', 'Level', 'Correct', 'Questions', 'Accuracy', 'Score', 'Date']))
  for (const a of sessions) {
    out.push(line([
      a.username, a.classroom_name ?? '—', `Level ${a.level_number}`, Number(a.correct_answers), Number(a.total_questions),
      `${pct(Number(a.correct_answers), Number(a.total_questions))}%`, Number(a.total_score), new Date(a.session_date).toLocaleString(),
    ]))
  }

  return out.join('\n')
}
