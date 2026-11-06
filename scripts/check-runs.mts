/**
 * Self-check for the pure scoring helpers (Nov 2026 revision):
 *   node scripts/check-runs.mts
 * Node 24 strips the TypeScript types itself — no build step.
 */
import assert from 'node:assert/strict'
import { bestRun, runScore, splitRuns, RUN_GAP_MS } from '../lib/runs.ts'
import { isBossDefeated, levelPoints, levelStarRating, trophyLevels } from '../lib/scoring.ts'
import { parseClassList } from '../lib/classList.ts'

const t0 = Date.UTC(2026, 10, 6, 2, 9, 30) // 10:09:30 PH time — a run that crosses 10:10
let id = 1
const answer = (phase: 'normal' | 'boss', correct: boolean, secondsIn: number) =>
  ({ id: id++, phase, correct, at: t0 + secondsIn * 1000 })

// ── runs ────────────────────────────────────────────────────────────────────
// Run 1: 5 quiz (3 right) + 5 boss (1 right) = 4/10, straddling a 10-minute boundary
const run1 = [
  ...[true, true, true, false, false].map((c, i) => answer('normal', c, i * 20)),
  ...[true, false, false, false, false].map((c, i) => answer('boss', c, 120 + i * 20)),
]
// Run 2 (retry, same minute window): 7/10
const run2 = [
  ...[true, true, true, true, false].map((c, i) => answer('normal', c, 300 + i * 20)),
  ...[true, true, true, false, false].map((c, i) => answer('boss', c, 420 + i * 20)),
]
// Run 3: an hour later, abandoned after 2 quiz answers (2/10)
const run3 = [answer('normal', true, 3600), answer('normal', true, 3620)]

const runs = splitRuns([...run3, ...run2, ...run1]) // order-insensitive
assert.equal(runs.length, 3, 'three runs')
assert.deepEqual(runs.map(runScore), [4, 7, 2])
assert.equal(runScore(bestRun(runs)!), 7, 'best run is the 7/10 retry')

// A tie goes to the most recent run
const tie = splitRuns([
  ...[true, false, false, false, false].map((c, i) => answer('normal', c, 9000 + i)),
  ...[true, false, false, false, false].map((c, i) => answer('normal', c, 9000 + RUN_GAP_MS / 1000 + 60 + i)),
])
assert.equal(tie.length, 2)
assert.equal(bestRun(tie), tie[1])

// Old data where the game ended after 3 boss answers still splits correctly
const short = splitRuns([
  ...[false, false, false, false, false].map((c, i) => answer('normal', c, 20000 + i)),
  ...[false, false, false].map((c, i) => answer('boss', c, 20010 + i)),
  ...[true, true, true, true, true].map((c, i) => answer('normal', c, 20020 + i)),
])
assert.deepEqual(short.map(r => r.length), [8, 5])

// ── scoring rules (panel: 1–5 = 1★, 6–9 = 2★, 10 = 3★; quiz 10 pts, boss 20) ─
assert.deepEqual([0, 1, 5, 6, 9, 10].map(levelStarRating), [0, 1, 1, 2, 2, 3])
assert.equal(levelPoints(0, 0), 0)
assert.equal(levelPoints(1, 0), 10)
assert.equal(levelPoints(0, 1), 20)
assert.equal(levelPoints(5, 5), 150)
assert.equal(isBossDefeated(0), false, 'quiz 1/5 + boss 0/5 → boss undefeated, no trophy')
assert.equal(isBossDefeated(1), true, 'quiz 0/5 + boss 1/5 → trophy')
assert.deepEqual(trophyLevels({ level1BossDefeated: true, level3BossDefeated: true, level4BossDefeated: false, replayLevels: [] }), [1, 3])
assert.deepEqual(trophyLevels(null), [])

// ── Registrar class lists ─────────────────────────────────────────────────────
const plain = parseClassList('Last Name,First Name,Middle Name\nSantos,John Mark,Cruz\n"Dela Cruz",Ana,R.\n')
assert.deepEqual(plain.students, [
  { lastName: 'Santos', firstName: 'John Mark', middleName: 'Cruz' },
  { lastName: 'Dela Cruz', firstName: 'Ana', middleName: 'R.' },
])

// Title rows above the header, semicolons (Excel in some locales), odd headers
const registrar = parseClassList([
  'FRANCISCO ADLAON LEARNING INSTITUTE;;;',
  'Grade 5 - Mahogany  SY 2026-2027;;;',
  ';;;',
  'No.;LRN;SURNAME;GIVEN NAME;MIDDLE INITIAL',
  '1;123456789012;GONZAGA;REGIE EDURIA;M.',
  '2;123456789013;Reyes;Pedro;',
].join('\r\n'))
assert.equal(registrar.students.length, 2)
assert.deepEqual(registrar.students[0], { lastName: 'GONZAGA', firstName: 'REGIE EDURIA', middleName: 'M.' })

// One "Name" column written "Last, First Middle" (DepEd SF1 style)
const single = parseClassList('LRN,"LEARNER\'S NAME (Last Name, First Name, Middle Name)"\n111,"SANTOS, MARIA CLARA, DIAZ"\n112,"Lim, Ben"\n')
assert.deepEqual(single.students, [
  { lastName: 'SANTOS', firstName: 'MARIA CLARA', middleName: 'DIAZ' },
  { lastName: 'Lim', firstName: 'Ben', middleName: '' },
])

// Tab separated + a "Full Name" column in "First Middle Last" order
const tabbed = parseClassList('Student Name\tSection\nJuan Dela Cruz\tMahogany\nKyle Fernandez\tMahogany\n')
assert.deepEqual(tabbed.students[1], { lastName: 'Fernandez', firstName: 'Kyle', middleName: '' })

// No usable header → a clear error, not a silent empty list
assert.match(parseClassList('foo,bar\n1,2\n').error ?? '', /Last Name/)

console.log('check-runs: all assertions passed')
