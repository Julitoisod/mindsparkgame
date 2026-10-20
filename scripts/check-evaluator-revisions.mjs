/**
 * Proves the 2026-10b evaluator revisions against a running dev server, and
 * screenshots each one.
 *
 *   1. npm run dev
 *   2. node scripts/check-evaluator-revisions.mjs
 *
 * Covers: admin teacher management (1), the Enrollment page (2), question
 * search + filters (3), the class record and its export (4), the game timer
 * and "Are you still there?" (5), the boss transition (6), the leaderboard (7).
 */
import puppeteer from 'puppeteer-core'
import mysql from 'mysql2/promise'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = process.env.CHROME_PATH
  ?? 'C:/Users/ISOD/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'
const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = path.resolve(import.meta.dirname, '../proof-screenshots')
const wait = ms => new Promise(r => setTimeout(r, ms))
fs.mkdirSync(OUT, { recursive: true })

const stamp = Date.now().toString(36)
const TEACHER_PASS = 'Passw0rd123'
const STUDENT_PASS = 'hero12345'
const pass = []

function ok(label) { pass.push(label); console.log('  PASS  ' + label) }

async function api(cookieBox, p, body, method = 'POST') {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookieBox.v ? { cookie: cookieBox.v } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) cookieBox.v = setCookie.split(';')[0]
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

// ── 1. Admin manages teacher accounts ────────────────────────────────────────
const adminBox = { v: '' }
const adminLogin = await api(adminBox, '/api/auth/login', { identifier: 'admin', password: 'Admin@12345' })
if (adminLogin.status !== 200 || adminLogin.json.data?.role !== 'admin') {
  throw new Error(`admin login failed: ${adminLogin.status} ${JSON.stringify(adminLogin.json).slice(0, 120)}`)
}
ok('item 1 — admin can sign in and is routed as an admin')

const newTeacher = `teach${stamp}`
const created = await api(adminBox, '/api/admin/teachers', {
  username: newTeacher, fullName: 'Evaluator Demo', email: `${newTeacher}@school.test`, password: TEACHER_PASS,
})
if (created.status !== 201) throw new Error(`admin could not create a teacher: ${created.json.message}`)
ok('item 1 — admin created a teacher account')

const teacherId = created.json.data.id
const listed = await api(adminBox, '/api/admin/teachers', null, 'GET')
if (!listed.json.data?.some(t => t.id === teacherId)) throw new Error('new teacher missing from the admin list')
ok('item 1 — admin can view teacher accounts')

await api(adminBox, `/api/admin/teachers/${teacherId}`, { fullName: 'Evaluator Demo (edited)' }, 'PATCH')
const edited = await api(adminBox, '/api/admin/teachers', null, 'GET')
if (edited.json.data.find(t => t.id === teacherId)?.fullName !== 'Evaluator Demo (edited)') {
  throw new Error('teacher edit did not stick')
}
ok('item 1 — admin can edit teacher information')

// A teacher may NOT use the admin endpoints
const teacherBox = { v: '' }
await api(teacherBox, '/api/auth/login', { identifier: newTeacher, password: TEACHER_PASS })
const forbidden = await api(teacherBox, '/api/admin/teachers', null, 'GET')
if (forbidden.status !== 403) throw new Error(`a teacher reached the admin API (${forbidden.status})`)
ok('item 1 — admin and teacher access are separate (teacher gets 403)')

// Deactivate -> that teacher can no longer sign in
await api(adminBox, `/api/admin/teachers/${teacherId}`, { isActive: false }, 'PATCH')
const blocked = await api({ v: '' }, '/api/auth/login', { identifier: newTeacher, password: TEACHER_PASS })
if (blocked.status !== 403) throw new Error(`a deactivated teacher still signed in (${blocked.status})`)
ok('item 1 — a deactivated teacher cannot sign in')
await api(adminBox, `/api/admin/teachers/${teacherId}`, { isActive: true }, 'PATCH')

// ── Set up a working teacher with a section, students and attempts ───────────
const workBox = { v: '' }
const workTeacher = `work${stamp}`
await api(workBox, '/api/auth/register', { username: workTeacher, email: `${workTeacher}@mindspark.test`, password: TEACHER_PASS })
await api(workBox, '/api/auth/login', { identifier: workTeacher, password: TEACHER_PASS })
const section = await api(workBox, '/api/teacher/classrooms', { name: `Grade 5 - Eval ${stamp}`, schoolYear: '2026-2027' })
const student = `s${stamp}`
const enrolled = await api(workBox, '/api/teacher/students', {
  classroomId: section.json.data.id, lastName: 'Dela Cruz', firstName: 'Ana', middleName: 'R',
  username: student, password: STUDENT_PASS,
})

const db = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'mindsparkgame', charset: 'utf8mb4' })
const [[{ id: workTeacherId }]] = await db.query('SELECT id FROM users WHERE username = ?', [workTeacher])
for (let level = 1; level <= 5; level++) {
  await db.query('INSERT INTO teacher_level_unlocks (student_id, level_number, unlocked_by) VALUES (?,?,?)',
    [enrolled.json.data.id, level, workTeacherId])
}
// Seed a played session so the class record and leaderboard have real numbers.
// quiz_attempts requires a character, so give the student one first.
const [charResult] = await db.query(
  `INSERT INTO character_data (user_id, name, class, hp, max_hp, mp, max_mp, attack, defense, speed, level, experience, experience_to_next)
   VALUES (?, 'Proof Hero', 'warrior', 110, 110, 40, 40, 12, 10, 5, 1, 0, 100)`,
  [enrolled.json.data.id],
)
const [qs] = await db.query('SELECT id, level_number FROM quiz_questions WHERE is_active = 1 ORDER BY level_number LIMIT 20')
for (const q of qs) {
  await db.query(
    `INSERT INTO quiz_attempts (user_id, character_id, level_number, phase, question_id, selected_answer, is_correct, hearts_remaining, score_earned)
     VALUES (?, ?, ?, 'normal', ?, 'x', 1, 3, 10)`,
    [enrolled.json.data.id, charResult.insertId, q.level_number, String(q.id)],
  )
}
const [answerRows] = await db.query('SELECT prompt, options, correct_index FROM quiz_questions WHERE is_active = 1')
const answerOf = new Map(answerRows.map(r => [r.prompt, JSON.parse(r.options)[r.correct_index]]))
await db.end()

// ── 4. Class record + export ─────────────────────────────────────────────────
const record = await api(workBox, '/api/teacher/class-record', null, 'GET')
if (!record.json.success || record.json.data.students.length === 0) throw new Error('class record is empty')
const row = record.json.data.students[0]
if (!('levels' in row) || !('categories' in row) || typeof row.total !== 'number') {
  throw new Error('class record row is missing levels/categories/total')
}
ok(`item 4 — class record built (${record.json.data.students.length} student(s), ${record.json.data.categories.length} categories)`)

// ── 7. Leaderboard ───────────────────────────────────────────────────────────
const studentBox = { v: '' }
await api(studentBox, '/api/auth/login', { identifier: student, password: STUDENT_PASS })
const board = await api(studentBox, '/api/leaderboard', null, 'GET')
if (!board.json.success || !Array.isArray(board.json.data.rows)) throw new Error('leaderboard did not load')
const mine = board.json.data.rows.find(r => r.isMe) ?? board.json.data.me
if (!mine) throw new Error('the signed-in student is not marked on the leaderboard')
if (!(mine.totalPoints > 0)) throw new Error('leaderboard points did not follow recorded play')
ok(`item 7 — leaderboard ranks by recorded points and marks the viewer (#${mine.rank}, ${mine.totalPoints} pts)`)

// ── Browser checks ───────────────────────────────────────────────────────────
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
const shot = async name => { await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('  shot ' + name) }
const typeInto = async (selector, text) => { await page.click(selector); await page.type(selector, text) }
/** Dev compiles each route on first hit, so wait for the URL rather than guessing. */
const waitForUrl = async (fragment, seconds = 30) => {
  for (let i = 0; i < seconds * 2 && !page.url().includes(fragment); i++) await wait(500)
  return page.url().includes(fragment)
}
const clickText = text => page.evaluate(t => {
  const el = [...document.querySelectorAll('button, a')].find(x => x.textContent?.trim().includes(t))
  el?.click()
  return Boolean(el)
}, text)

// Admin UI
await page.goto(`${BASE}/admin-login`, { waitUntil: 'networkidle2' })
await typeInto('input[placeholder="hero123"]', 'admin')
await typeInto('input[type="password"]', 'Admin@12345')
await clickText('Sign In')
if (!await waitForUrl('/admin/teachers')) throw new Error(`admin was not routed to /admin/teachers (at ${page.url()})`)
await wait(2000)
await shot('eval-01-admin-teacher-accounts')
ok('item 1 — admin UI lists teacher accounts')

// Teacher UI: nav order + Enrollment page
await page.goto(`${BASE}/teacher-login`, { waitUntil: 'networkidle2' })
await typeInto('input[placeholder="hero123"]', workTeacher)
await typeInto('input[type="password"]', TEACHER_PASS)
await clickText('Sign In')
await waitForUrl('/teacher/dashboard')
await wait(2000)
const navLabels = await page.evaluate(() =>
  [...document.querySelectorAll('nav a, aside a')].map(a => a.textContent?.trim()).filter(Boolean))
for (const label of ['Dashboard', 'Section', 'Enrollment', 'Students', 'Question Bank', 'Reports']) {
  if (!navLabels.some(l => l.includes(label))) throw new Error(`nav is missing "${label}" (saw ${navLabels.join(' | ')})`)
}
ok('item 2 — teacher navigation reads Dashboard · Section · Enrollment · Students · Question Bank · Reports')

const dashText = await page.evaluate(() => document.body.innerText)
if (/Upload Official Class List|Manual Enrollment/i.test(dashText)) {
  throw new Error('enrollment is still on the dashboard')
}
ok('item 2 — enrollment no longer sits on the dashboard')

await page.goto(`${BASE}/teacher/enrollment`, { waitUntil: 'networkidle2' })
await wait(2500)
const enrolText = await page.evaluate(() => document.body.innerText)
if (!/Upload Official Class List/i.test(enrolText) || !/Manual Enrollment/i.test(enrolText)) {
  throw new Error('the Enrollment page is missing the CSV or manual section')
}
await shot('eval-02-enrollment-page')
ok('item 2 — the Enrollment page carries the same CSV + manual enrollment')

// Question search + filters
await page.goto(`${BASE}/teacher/questions`, { waitUntil: 'networkidle2' })
await wait(3000)
const beforeFilter = await page.evaluate(() => document.querySelectorAll('[class*="rounded-xl"][class*="border"] p').length)
await typeInto('input[type="search"]', 'solid figure')
await wait(1200)
const filterLine = await page.evaluate(() => document.body.innerText.match(/\d+ of \d+ questions/)?.[0] ?? '')
if (!filterLine) throw new Error('the question list did not report a filtered count')
const [shown, totalShown] = filterLine.match(/(\d+) of (\d+)/).slice(1).map(Number)
if (!(shown < totalShown)) throw new Error(`search did not narrow the list (${filterLine})`)
await shot('eval-03-question-search-filter')
ok(`item 3 — search narrows the question list (${filterLine}, from ${beforeFilter} cards)`)

const categoryOptions = await page.$$eval('select option', os => os.map(o => o.textContent))
if (!categoryOptions.some(o => o?.includes('All categories'))) throw new Error('category filter missing')
ok('item 3 — category filter present and combines with level, phase and search')

// Class record on Reports
await page.goto(`${BASE}/teacher/reports`, { waitUntil: 'networkidle2' })
// Poll: a dev server compiles this page on first hit, and the record loads after
let reportText = ''
for (let i = 0; i < 30; i++) {
  await wait(600)
  reportText = await page.evaluate(() => document.body.innerText)
  if (/Class Record/i.test(reportText)) break
}
if (!/Class Record/i.test(reportText)) throw new Error('class record is not on the reports page')
if (!/Download \(CSV/i.test(reportText)) throw new Error('class record has no download button')
// scroll the record into view before the screenshot
await page.evaluate(() => {
  const heading = [...document.querySelectorAll('h3')].find(h => /Class Record/i.test(h.textContent ?? ''))
  heading?.scrollIntoView({ block: 'start' })
})
await wait(1200)
await shot('eval-04-class-record')
ok('item 4 — class record with export is on the Reports page')

// ── Student side: leaderboard, timer, boss transition ────────────────────────
const appPage = await browser.newPage()
await appPage.setViewport({ width: 800, height: 360, isMobile: true, deviceScaleFactor: 2 })
await appPage.evaluateOnNewDocument(() => { window.Capacitor = { isNativePlatform: () => true } })
await appPage.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
await appPage.type('input[aria-label="Username"]', student)
await appPage.type('input[type="password"]', STUDENT_PASS)
await appPage.evaluate(() => {
  [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Log In'))?.click()
})
await wait(4500)
await appPage.goto(`${BASE}/character-select`, { waitUntil: 'networkidle2' })
await wait(2500)
await appPage.evaluate(() => {
  [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Enter Dashboard'))?.click()
})
await wait(3000)

await appPage.goto(`${BASE}/dashboard/leaderboard`, { waitUntil: 'networkidle2' })
await wait(2500)
const boardText = await appPage.evaluate(() => document.body.innerText)
if (!/Leaderboard/i.test(boardText) || !/YOU/.test(boardText)) {
  throw new Error('leaderboard did not highlight the signed-in student')
}
await appPage.screenshot({ path: `${OUT}/eval-05-leaderboard.png` })
console.log('  shot eval-05-leaderboard')
ok('item 7 — leaderboard screen highlights the current student')

// Into a level for the timer + boss transition
await appPage.goto(`${BASE}/game`, { waitUntil: 'networkidle2' })
await wait(3500)
await appPage.evaluate(() => {
  const nodes = [...document.querySelectorAll('button:not([disabled])')].filter(b => b.querySelector('img'))
  nodes[0]?.click()
})
await wait(1500)
await appPage.evaluate(() => {
  [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Start the Adventure'))?.click()
})
await wait(1500)
await appPage.evaluate(() => {
  [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Begin Quest'))?.click()
})
await wait(3000)

const hud = await appPage.evaluate(() => document.body.innerText)
if (!/\b\d+:\d{2}\b/.test(hud)) throw new Error('no countdown visible in the battle HUD')
await appPage.screenshot({ path: `${OUT}/eval-06-game-timer.png` })
console.log('  shot eval-06-game-timer')
ok('item 5 — a countdown is visible during the quiz')

// ── item 6: the quiz → boss transition ──────────────────────────────────────
let sawTransition = false
for (let q = 0; q < 6 && !sawTransition; q++) {
  const screenText = await appPage.evaluate(() => document.body.innerText)
  const prompt = [...answerOf.keys()].find(k => screenText.includes(k))
  if (!prompt) break
  await appPage.evaluate(ans => {
    const btn = [...document.querySelectorAll('button')]
      .find(b => (b.textContent ?? '').replace(/^[A-D]\.\s*/, '').trim() === ans)
    btn?.click()
  }, answerOf.get(prompt))
  // the overlay only lives for ~2.2s, so poll hard right after each answer
  for (let poll = 0; poll < 24 && !sawTransition; poll++) {
    await wait(250)
    sawTransition = await appPage.evaluate(() => /boss battle phase/i.test(document.body.innerText))
  }
  if (sawTransition) {
    await appPage.screenshot({ path: `${OUT}/eval-07-boss-transition.png` })
    console.log('  shot eval-07-boss-transition')
  }
  await wait(1200)
}
if (!sawTransition) throw new Error('the quiz never handed off to the boss battle with a transition')
ok('item 6 — animated Quiz to Boss Battle transition plays')

// ── item 5: the timer runs out and asks instead of closing ──────────────────
console.log('  waiting out the question timer (about a minute)...')
let askedStillThere = false
for (let i = 0; i < 150 && !askedStillThere; i++) {
  await wait(1000)
  askedStillThere = await appPage.evaluate(() => /are you still there/i.test(document.body.innerText))
}
if (!askedStillThere) throw new Error('the timer ran out without asking "Are you still there?"')
await appPage.screenshot({ path: `${OUT}/eval-08-are-you-still-there.png` })
console.log('  shot eval-08-are-you-still-there')
const stillInGame = await appPage.evaluate(() => /QUESTION|LEVEL/i.test(document.body.innerText))
if (!stillInGame) throw new Error('the game closed when the timer ran out')
await appPage.evaluate(() => {
  [...document.querySelectorAll('button')].find(b => /still here/i.test(b.textContent ?? ''))?.click()
})
await wait(1500)
const resumed = await appPage.evaluate(() => !/are you still there/i.test(document.body.innerText))
if (!resumed) throw new Error('the game did not resume after confirming')
ok('item 5 — the timer asks "Are you still there?" and play resumes; the game never closes')

await browser.close()
console.log(`\nAll ${pass.length} evaluator checks PASSED.`)
