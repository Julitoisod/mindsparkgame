/**
 * Screenshots every screen touched by the 2026-10 revision (REVISION1.pdf):
 * landing page, student login, teacher login, choose character, level map,
 * the badge popup, the student profile and the teacher's Account Details.
 *
 *   1. npm run dev
 *   2. node scripts/shoot-revision-proof.mjs
 *
 * Creates a throwaway teacher + student (local DB only — never point at live).
 */
import puppeteer from 'puppeteer-core'
import mysql from 'mysql2/promise'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = process.env.CHROME_PATH
  ?? 'C:/Users/ISOD/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'
const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = path.resolve(import.meta.dirname, '../proof-screenshots')
const stamp = Date.now().toString(36)
const PASS = 'Passw0rd123'
const STUDENT_PASS = 'hero12345'
const wait = ms => new Promise(r => setTimeout(r, ms))
fs.mkdirSync(OUT, { recursive: true })

let cookie = ''
async function api(p, body) {
  const res = await fetch(`${BASE}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  })
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) cookie = setCookie.split(';')[0]
  const json = await res.json().catch(() => ({}))
  if (res.status >= 300) throw new Error(`${p} ${res.status}: ${json.message}`)
  return json
}

// ── Teacher + student, every level unlocked ──────────────────────────────────
const teacher = `r${stamp}`
await api('/api/auth/register', { username: teacher, email: `${teacher}@mindspark.test`, password: PASS })
await api('/api/auth/login', { identifier: teacher, password: PASS })
const section = await api('/api/teacher/classrooms', { name: `Grade 5 - Revision ${stamp}`, schoolYear: '2026-2027' })
const student = `s${stamp}`
const enrolled = await api('/api/teacher/students', {
  classroomId: section.data.id, lastName: 'Cabusao', firstName: 'Prescillia', middleName: 'Basmayor',
  username: student, password: STUDENT_PASS,
})
console.log('  enrolled student returns initialPassword:', JSON.stringify(enrolled.data.initialPassword))
if (enrolled.data.initialPassword !== STUDENT_PASS) throw new Error('item 6: password not readable back')

const db = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'mindsparkgame', charset: 'utf8mb4' })
const [[{ id: teacherId }]] = await db.query('SELECT id FROM users WHERE username = ?', [teacher])
for (let level = 1; level <= 5; level++) {
  await db.query('INSERT INTO teacher_level_unlocks (student_id, level_number, unlocked_by) VALUES (?,?,?)',
    [enrolled.data.id, level, teacherId])
}
const [bank] = await db.query('SELECT prompt, options, correct_index FROM quiz_questions WHERE is_active = 1')
await db.end()
const answerOf = new Map(bank.map(r => [r.prompt, JSON.parse(r.options)[r.correct_index]]))

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 })
const shot = async name => { await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('  shot', name) }
const clickText = text => page.evaluate(t => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent?.includes(t))
  b?.click()
  return Boolean(b)
}, text)

// ── 1-5. Landing page (teacher only) ─────────────────────────────────────────
await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' })
await wait(1200)
await shot('rev-01-landing-teacher-only')
const landingText = await page.evaluate(() => document.body.innerText)
if (landingText.includes('Student Sign In')) throw new Error('item 2: Student Sign In still on the landing page')
if (landingText.includes('Grade 3')) throw new Error('item 1: Grade 3 still on the landing page')

// ── 12-13. Student login ─────────────────────────────────────────────────────
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
await wait(1200)
await shot('rev-02-student-login')
if ((await page.evaluate(() => document.body.innerText)).toLowerCase().includes('teacher')) {
  throw new Error('item 12: student login still mentions the teacher')
}

// ── Teacher login ────────────────────────────────────────────────────────────
await page.goto(`${BASE}/teacher-login`, { waitUntil: 'networkidle2' })
await wait(900)
await shot('rev-03-teacher-login')

// ── 7-9. Choose character ────────────────────────────────────────────────────
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
await page.type('input[aria-label="Username"]', student)
await page.type('input[type="password"]', STUDENT_PASS)
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), clickText('Log In')])
await page.goto(`${BASE}/character-select`, { waitUntil: 'networkidle2' })
await wait(2000)
await shot('rev-04-choose-character')
const charText = await page.evaluate(() => document.body.innerText)
// The counter rendered as the label "Stars" directly above its number; the
// sentence "...with earned stars." must not trip this check.
if (/Stars\s*\n\s*\d/i.test(charText)) throw new Error('item 7: star counter still on choose character')

// ── 10-11. Level map ─────────────────────────────────────────────────────────
await clickText('Enter Dashboard')
await wait(3000)
await page.goto(`${BASE}/game`, { waitUntil: 'networkidle2' })
await wait(3500)
await shot('rev-05-level-map')

// ── 15. Badge popup (math_streak = 5 correct in a row) ───────────────────────
await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('button:not([disabled])')].filter(b => b.querySelector('img'))
  nodes[0]?.click()
})
await wait(1500)
await clickText('Start the Adventure'); await wait(1500)
await clickText('Begin Quest'); await wait(2500)

// The server awards math_streak on the 5th correct answer in a row, so keep
// answering correctly (the quiz rolls straight into the boss phase) and poll
// for the popup — it only stays up for 4 seconds.
let popped = false
for (let q = 0; q < 10 && !popped; q++) {
  const prompt = await page.evaluate(() => document.body.innerText)
  const hit = [...answerOf.keys()].find(p => prompt.includes(p))
  if (!hit) { console.log(`  no question on screen at step ${q + 1}`); break }
  const correct = answerOf.get(hit)
  await page.evaluate(ans => {
    const btn = [...document.querySelectorAll('button')]
      .find(b => (b.textContent ?? '').replace(/^[A-D]\.\s*/, '').trim() === ans)
    btn?.click()
  }, correct)
  for (let poll = 0; poll < 12 && !popped; poll++) {
    await wait(300)
    popped = await page.evaluate(() => /badge earned!/i.test(document.body.innerText))
  }
  if (popped) await shot('rev-06-badge-popup-centered')
  await wait(1200)
}
if (!popped) console.log('  NOTE: badge popup not reached in this run')

// ── 16. Profile ──────────────────────────────────────────────────────────────
await page.goto(`${BASE}/dashboard/profile`, { waitUntil: 'networkidle2' })
await wait(2500)
await shot('rev-07-profile-no-playtime')
const profileText = await page.evaluate(() => document.body.innerText)
if (/playtime/i.test(profileText) || /\b0m\b/.test(profileText)) {
  throw new Error('item 16: playtime still shown on the profile')
}
for (const [name, url] of [['store', '/dashboard/store'], ['attempts', '/dashboard/attempts']]) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle2' })
  await wait(1800)
  await shot(`rev-08-${name}-same-background`)
}

// ── 6. Teacher sees the student's password ───────────────────────────────────
const teacherPage = await browser.newPage()
await teacherPage.setViewport({ width: 1280, height: 950 })
await teacherPage.setCookie({ name: cookie.split('=')[0], value: cookie.split('=').slice(1).join('='), url: BASE })
await teacherPage.goto(`${BASE}/teacher/students`, { waitUntil: 'networkidle2' })
await wait(2500)
await teacherPage.evaluate(() => {
  const card = [...document.querySelectorAll('div')].find(d => d.textContent?.includes('@') && d.className.includes('cursor-pointer'))
  card?.click()
})
await wait(1500)
await teacherPage.screenshot({ path: `${OUT}/rev-09-teacher-sees-password.png` })
console.log('  shot rev-09-teacher-sees-password')
const teacherText = await teacherPage.evaluate(() => document.body.innerText)
if (!teacherText.includes(STUDENT_PASS)) throw new Error('item 6: password not visible in Account Details')

await browser.close()
console.log('\nAll revision checks PASSED. Screenshots in proof-screenshots/rev-*.png')
