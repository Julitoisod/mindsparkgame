/**
 * Applies the pending database work to the LIVE Hostinger database:
 *   1. database/migrations/2026-10-revision.sql  (users.initial_password)
 *   2. database/seed-questions.sql               (the 72 Grade 5 questions)
 * then verifies both and prints what the live database now holds.
 *
 * Credentials come from .env.prod.local (gitignored), which needs:
 *   DB_HOST=...        <- from hPanel -> Databases -> MySQL (the remote host)
 *   DB_PORT=3306
 *   DB_USER=...
 *   DB_PASSWORD=...
 *   DB_NAME=...
 *
 * Requires Remote MySQL to be enabled for this computer's IP in hPanel.
 *
 *   node scripts/apply-live-db.mjs --check    # connect and report only
 *   node scripts/apply-live-db.mjs --apply    # actually write
 *
 * Both files are safe to re-run: the migration is IF NOT EXISTS, and the seed
 * replaces only system questions (created_by IS NULL) — never a teacher's own.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import mysql from 'mysql2/promise'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const APPLY = process.argv.includes('--apply')

const env = {}
try {
  for (const line of readFileSync(join(ROOT, '.env.prod.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/)
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch {
  console.error('Missing .env.prod.local — see the header of this file for what it needs.')
  process.exit(1)
}

for (const key of ['DB_HOST', 'DB_USER', 'DB_NAME']) { // password may be blank on XAMPP
  if (!env[key]) { console.error(`.env.prod.local is missing ${key}`); process.exit(1) }
}
// Guard: this script is for the live server. Pointing it at XAMPP is a mistake.
// --local-test exists so the whole flow can be rehearsed against XAMPP first.
if (['localhost', '127.0.0.1'].includes(env.DB_HOST) && !process.argv.includes('--local-test')) {
  console.error('DB_HOST is localhost — that is the XAMPP database, not the live one. Aborting.')
  process.exit(1)
}

const conn = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  charset: 'utf8mb4',
  multipleStatements: true,
})
console.log(`Connected to ${env.DB_USER}@${env.DB_HOST}/${env.DB_NAME}\n`)

const countQuestions = async () => {
  const [[row]] = await conn.query('SELECT COUNT(*) c FROM quiz_questions WHERE created_by IS NULL')
  return row.c
}
const hasPasswordColumn = async () => {
  const [[row]] = await conn.query(
    `SELECT COUNT(*) c FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'initial_password'`)
  return row.c > 0
}
const [[teacherRow]] = await conn.query("SELECT COUNT(*) c FROM users WHERE role = 'teacher'")
const [[studentRow]] = await conn.query("SELECT COUNT(*) c FROM users WHERE role = 'student'")
const [[ownQuestions]] = await conn.query('SELECT COUNT(*) c FROM quiz_questions WHERE created_by IS NOT NULL')

console.log('BEFORE')
console.log(`  users:              ${teacherRow.c} teachers, ${studentRow.c} students`)
console.log(`  system questions:   ${await countQuestions()}`)
console.log(`  teacher questions:  ${ownQuestions.c}  (never touched)`)
console.log(`  initial_password:   ${await hasPasswordColumn() ? 'present' : 'MISSING'}`)

if (!APPLY) {
  console.log('\n--check only, nothing written. Re-run with --apply to write.')
  await conn.end()
  process.exit(0)
}

console.log('\nAPPLYING')
const migration = readFileSync(join(ROOT, 'database/migrations/2026-10-revision.sql'), 'utf8')
await conn.query(migration)
console.log('  1/2 migration 2026-10-revision.sql applied')

const seed = readFileSync(join(ROOT, 'database/seed-questions.sql'), 'utf8')
await conn.query(seed)
console.log('  2/2 seed-questions.sql applied')

const seeded = await countQuestions()
const [[afterOwn]] = await conn.query('SELECT COUNT(*) c FROM quiz_questions WHERE created_by IS NOT NULL')
const [perLevel] = await conn.query(
  `SELECT level_number, phase, COUNT(*) n FROM quiz_questions
    WHERE created_by IS NULL GROUP BY level_number, phase ORDER BY level_number, phase`)

console.log('\nAFTER')
console.log(`  system questions:   ${seeded}`)
console.log(`  teacher questions:  ${afterOwn.c}  (unchanged: ${afterOwn.c === ownQuestions.c})`)
console.log(`  initial_password:   ${await hasPasswordColumn() ? 'present' : 'MISSING'}`)
for (const r of perLevel) console.log(`    L${r.level_number} ${r.phase.padEnd(6)} ${r.n}`)

if (seeded !== 72) throw new Error(`expected 72 system questions, got ${seeded}`)
if (!(await hasPasswordColumn())) throw new Error('initial_password column still missing')
if (afterOwn.c !== ownQuestions.c) throw new Error('teacher-authored questions changed — they must not')

await conn.end()
console.log('\nLive database is up to date.')
