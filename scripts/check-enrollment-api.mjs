/**
 * End-to-end check for the two enrollment paths a teacher can use.
 *
 * The panel hit "Bulk enrollment failed" on a server whose database was missing
 * the last_name/first_name/middle_name columns, and the 500 said nothing about
 * why. This exercises both routes against a running server so that regression
 * is caught here instead of at the partner school.
 *
 *   1. npm run dev
 *   2. node scripts/check-enrollment-api.mjs
 *
 * Creates a throwaway teacher + section, so it is safe to re-run.
 */
import assert from 'node:assert/strict'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const stamp = Date.now().toString(36)
let cookie = ''

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...options.headers },
  })
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) cookie = setCookie.split(';')[0]
  return { status: res.status, json: await res.json().catch(() => ({})) }
}

const teacher = `t${stamp}`
const step = msg => console.log(`  ${msg}`)

console.log('Enrollment API check\n')

// ── Teacher + section ────────────────────────────────────────────────────────
const reg = await api('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ username: teacher, email: `${teacher}@mindspark.test`, password: 'Passw0rd123' }),
})
assert.equal(reg.status, 201, `register failed: ${JSON.stringify(reg.json)}`)
step(`teacher ${teacher} registered`)

const section = await api('/api/teacher/classrooms', {
  method: 'POST',
  body: JSON.stringify({ name: `Grade 3 - Check ${stamp}`, schoolYear: '2026-2027' }),
})
assert.equal(section.status, 201, `section failed: ${JSON.stringify(section.json)}`)
const classroomId = section.json.data.id
assert.equal(section.json.data.schoolYear, '2026-2027', 'school year not stored on the section')
step(`section ${classroomId} created with SY 2026-2027`)

// ── 1. Bulk (Registrar class list) ───────────────────────────────────────────
const bulk = await api('/api/teacher/students/bulk', {
  method: 'POST',
  body: JSON.stringify({
    classroomId,
    students: [
      { lastName: 'Santos', firstName: 'John Mark', middleName: 'Cruz' },
      { lastName: 'Reyes', firstName: 'Maria', middleName: 'Dela' },
      { lastName: 'Santos', firstName: 'Jose', middleName: '' }, // collides with jsantos
    ],
  }),
})
assert.equal(bulk.status, 200, `BULK FAILED (${bulk.status}): ${bulk.json.message}`)
assert.equal(bulk.json.data.enrolledCount, 3, `expected 3 enrolled, got ${bulk.json.data.enrolledCount}`)

// Usernames are unique system-wide, so a re-runnable check asserts the RULE
// (first initial + last name, numeric suffix on collision) not a literal value.
const [a, b, c] = bulk.json.data.results
assert.match(a.username, /^jsantos\d*$/, `expected jsantos-style username, got ${a.username}`)
assert.match(b.username, /^mreyes\d*$/, `expected mreyes-style username, got ${b.username}`)
assert.match(c.username, /^jsantos\d+$/, 'collision must get a numeric suffix')
assert.notEqual(a.username, c.username, 'colliding names must not share a username')
for (const r of [a, b, c]) {
  assert.equal(r.password, `${r.username}123`, 'password must be username + "123"')
}
assert.equal(a.name, 'John Mark Cruz Santos', 'full_name must compose as "First Middle Last"')
step(`bulk enrolled 3: ${[a, b, c].map(r => `${r.username}/${r.password}`).join(', ')}`)

// ── 2. Manual (must keep working — the panel tests with it) ──────────────────
const manual = await api('/api/teacher/students', {
  method: 'POST',
  body: JSON.stringify({
    classroomId,
    lastName: 'Bautista',
    firstName: 'Ana',
    middleName: 'Lim',
    username: `ana${stamp}`,
    password: 'anapass123',
  }),
})
assert.equal(manual.status, 201, `MANUAL FAILED (${manual.status}): ${manual.json.message}`)
assert.equal(manual.json.data.fullName, 'Ana Lim Bautista')
assert.equal(manual.json.data.lastName, 'Bautista')
assert.equal(manual.json.data.firstName, 'Ana')
assert.equal(manual.json.data.middleName, 'Lim')
step(`manual enrolled ${manual.json.data.username} (${manual.json.data.fullName})`)

// ── 3. Both students land in the section ─────────────────────────────────────
const list = await api(`/api/teacher/students?classroomId=${classroomId}`)
assert.equal(list.status, 200)
assert.equal(list.json.data.length, 4, `expected 4 students in the section, got ${list.json.data.length}`)
step(`section lists all 4 students`)

// ── 4. A student created by bulk can actually log in ─────────────────────────
cookie = ''
const login = await api('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ identifier: a.username, password: a.password }),
})
assert.equal(login.status, 200, `generated credentials do not work: ${JSON.stringify(login.json)}`)
step('generated credentials log in')

console.log('\nAll enrollment checks passed.')
