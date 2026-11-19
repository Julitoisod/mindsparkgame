/**
 * Self-check for the shared dashboard analytics (Nov 2026b revision):
 *   node scripts/check-analytics.mts
 * Node 24 strips the types; the hook below lets lib files keep their
 * extensionless imports (`./proficiency`), as Next expects.
 */
import assert from 'node:assert/strict'
import { register } from 'node:module'

register('data:text/javascript,' + encodeURIComponent(
  'export async function resolve(s, c, next) { if (/^\\.\\.?\\//.test(s) && !/\\.\\w+$/.test(s)) s += ".ts"; return next(s, c) }',
))
const { buildAnalytics, studentBand } = await import('../lib/analytics.ts')

const cell = (score: number, attempts = 10) => ({ score, attempts })
const none = { score: 0, attempts: 0 }
const row = (id: number, scores: (number | null)[], categories = {}) => ({
  id,
  levels: Object.fromEntries(scores.map((s, i) => [i + 1, s === null ? none : cell(s)])),
  categories,
})

const titles = ['A', 'B', 'C', 'D', 'E']
const rows = [
  row(1, [4, 4, null, null, null], { Multiplication: { correct: 4, asked: 8 } }),   // 8/20 = 40% → Beginning
  row(2, [9, 9, 9, null, null], { Multiplication: { correct: 7, asked: 8 }, Division: { correct: 4, asked: 4 } }), // 90% → Advanced
  row(3, [null, null, null, null, null]),                                            // Not Started
  row(4, [8, null, null, null, null]),                                               // 80% → Approaching
]

const a = buildAnalytics(rows, titles)

// Level averages count only the students who played that level
assert.deepEqual(a.levelAverages.map(l => l.average), [7, 6.5, 9, null, null])
assert.deepEqual(a.levelAverages.map(l => l.students), [3, 2, 1, 0, 0])
assert.equal(a.levelAverages[0].title, 'A')

// Class average: (4+4+9+9+9+8)/6 = 7.17 → 72%
assert.equal(a.classAverage, 72)

// Bands
assert.equal(studentBand(rows[0]), 'Beginning')
assert.equal(studentBand(rows[1]), 'Advanced')
assert.equal(studentBand(rows[3]), 'Approaching Proficiency')
assert.equal(a.proficiency.notStarted, 1)
assert.deepEqual(Object.fromEntries(a.proficiency.bands.map(b => [b.band, b.count])), {
  Beginning: 1, Developing: 0, 'Approaching Proficiency': 1, Proficient: 0, Advanced: 1,
})

// Gaps: lowest played level (L2 at 6.5), most-missed category (Multiplication 5/16 wrong)
assert.equal(a.gaps.hardestLevel?.level, 2)
assert.equal(a.gaps.commonMistake?.category, 'Multiplication')
assert.equal(a.gaps.commonMistake?.wrongPct, 31)

// Nobody played: no averages, no gaps, everyone Not Started
const empty = buildAnalytics([row(9, [null, null, null, null, null])], titles)
assert.equal(empty.classAverage, null)
assert.equal(empty.gaps.hardestLevel, null)
assert.equal(empty.gaps.commonMistake, null)
assert.equal(empty.proficiency.notStarted, 1)

console.log('check-analytics: all assertions passed')
