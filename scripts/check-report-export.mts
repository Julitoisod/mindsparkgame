/**
 * Self-check for the full Reports download (Nov 2026b revision):
 *   node scripts/check-report-export.mts
 */
import assert from 'node:assert/strict'
import { register } from 'node:module'

register('data:text/javascript,' + encodeURIComponent(
  'export async function resolve(s, c, next) { if (/^\\.\\.?\\//.test(s) && !/\\.\\w+$/.test(s)) s += ".ts"; return next(s, c) }',
))
const { buildFullReportCsv, reportSummary, studentPerformance } = await import('../lib/reportExport.ts')

const student = (id: number, color: 'none' | 'green' | 'yellow' | 'red', levels: number, scores: [number, number, number, number][] = []) => ({
  id,
  username: `kid${id}`,
  classroomName: 'Rizal',
  progress: { levelsCompleted: levels, totalLevels: 5, starBalance: levels * 3, performanceColor: color },
  quizScores: scores.map(([levelNumber, totalAttempts, correctAttempts, totalScore]) => ({ levelNumber, totalAttempts, correctAttempts, totalScore })),
})

const students = [
  student(1, 'green', 3, [[1, 10, 9, 160], [2, 10, 8, 140]]),
  student(2, 'yellow', 1, [[1, 10, 4, 60]]),
  student(3, 'none', 0),
  student(4, 'red', 0, [[1, 10, 2, 20]]),
]

const s = reportSummary(students)
assert.equal(s.total, 4)
assert.deepEqual([s.green, s.yellow, s.red, s.none], [1, 1, 1, 1])
assert.equal(s.completionRate, 25)
assert.equal(s.activeRate, 75)
assert.equal(s.needsAttention, 2)
assert.deepEqual(s.levelCompletion.map(l => l.completed), [2, 1, 1, 0, 0])

const p = studentPerformance(students[0])
assert.equal(p.accuracy, 85)
assert.equal(p.points, 300)
assert.equal(p.proficiency.band, 'Proficient')

const csv = buildFullReportCsv({
  students,
  sessions: [{ user_id: 1, username: 'kid1', classroom_name: 'Rizal', level_number: 1, session_date: '2026-11-18T02:00:00Z', total_questions: 10, correct_answers: 9, total_score: 160 }],
  record: {
    students: [{ name: 'Kid "One"', username: 'kid1', section: 'Rizal', levels: { 1: { score: 9, attempts: 10 }, 2: { score: 8, attempts: 10 }, 3: { score: 0, attempts: 0 }, 4: { score: 0, attempts: 0 }, 5: { score: 0, attempts: 0 } }, categories: { Fractions: { correct: 4, asked: 5 } }, total: 17 }],
    categories: ['Fractions'],
  },
  scopeLabel: 'All sections',
  generatedAt: new Date('2026-11-19T00:00:00Z'),
})

// Every module is in the file, in order — not just the class record
const headings = ['1. SUMMARY', '2. PERFORMANCE DISTRIBUTION', '3. LEVEL COMPLETION OVERVIEW', '4. INTERVENTION SUMMARY',
  '5. STUDENT PERFORMANCE', '6. CLASS RECORD', '7. SCORES PER LEVEL', '8. QUIZ ATTEMPTS']
let at = -1
for (const h of headings) {
  const i = csv.indexOf(`"${h}`)
  assert.ok(i > at, `missing or out of order: ${h}`)
  at = i
}
assert.ok(csv.includes('"Kid ""One"""'), 'quotes are escaped')
assert.ok(csv.includes('"Class average","","","9","8","—","—","—"'), 'class average row')
assert.ok(csv.includes('"Fractions (correct/total)"') && csv.includes('"4/5"'), 'categories')
assert.ok(csv.includes('"9/10 (90%, 160pt)"'), 'scores per level cell')

console.log('check-report-export: all assertions passed')
