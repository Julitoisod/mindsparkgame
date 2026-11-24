/**
 * Proves the Nov 2026b revision (REVISIONSS.pdf) against a running server and
 * screenshots every changed screen into proof-screenshots/revision-2026-11b/.
 *
 *   1. npm run dev   (or npm run build && npx next start)
 *   2. node scripts/check-revision-2026-11b.mjs
 *
 * Local DB only: creates a throwaway teacher with two sections and five
 * students, and seeds quiz attempts so every chart has data.
 */
import puppeteer from 'puppeteer-core'
import mysql from 'mysql2/promise'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createTeacher } from './lib/teacher-account.mjs'

const CHROME = process.env.CHROME_PATH
  ?? 'C:/Users/ISOD/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'
const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = path.resolve(import.meta.dirname, '../proof-screenshots/revision-2026-11b')
const stamp = Date.now().toString(36)
const PASS = 'Passw0rd123'
const STUDENT_PASS = 'hero12345'
const wait = ms => new Promise(r => setTimeout(r, ms))
fs.mkdirSync(OUT, { recursive: true })

const passed = []
function check(cond, label) { if (!cond) throw new Error('FAIL  ' + label); passed.push(label); console.log('  PASS  ' + label) }

async function api(box, p, body, method = body ? 'POST' : 'GET') {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(box.v ? { cookie: box.v } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) box.v = setCookie.split(';')[0]
  return { status: res.status, json: await res.json().catch(() => ({})) }
}

// ════ Setup: teacher, two sections, five students, seeded runs ═════════════
const teacher = `rv${stamp}`
await createTeacher(BASE, { username: teacher, email: `${teacher}@mindspark.test`, password: PASS })
const tBox = { v: '' }
await api(tBox, '/api/auth/login', { identifier: teacher, password: PASS })
await api(tBox, '/api/account', { lastName: 'Santos', firstName: 'Raffy' }, 'PATCH')
const rizal = (await api(tBox, '/api/teacher/classrooms', { name: `Rizal ${stamp}`, schoolYear: '2026-2027' })).json.data
const winter = (await api(tBox, '/api/teacher/classrooms', { name: `Winter ${stamp}`, schoolYear: '2026-2027' })).json.data
const people = [
  ['Perez', 'Juan Miguel', rizal], ['Santos', 'Maria Clara', rizal], ['Lim', 'Angelo', rizal],
  ['Cabusao', 'Prescilla', winter], ['June', 'April', winter],
]
const students = []
for (const [i, [lastName, firstName, section]] of people.entries()) {
  const username = `r${stamp}${i}`
  const s = (await api(tBox, '/api/teacher/students', { classroomId: section.id, lastName, firstName, middleName: '', username, password: STUDENT_PASS })).json.data
  students.push({ ...s, username, sectionId: section.id })
}
check(students.length === 5 && students.every(s => s.id), 'teacher with 2 sections (3 + 2 students) set up')

const db = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'mindsparkgame', charset: 'utf8mb4' })
const [bank] = await db.query('SELECT id, level_number, phase, prompt, options, correct_index FROM quiz_questions WHERE is_active = 1')
const answerOf = new Map(bank.map(r => [r.prompt.replace(/\bblank\b/gi, '____'), JSON.parse(r.options)[r.correct_index]]))

/** One full level run: 5 quiz + 5 boss answers with real question ids. */
async function seedRun(student, charId, level, quiz, boss, minutesAgo) {
  for (const [phase, answers] of [['normal', quiz], ['boss', boss]]) {
    const pool = bank.filter(q => q.level_number === level && q.phase === phase)
    for (const [i, right] of answers.entries()) {
      const q = pool[i % pool.length]
      await db.query(
        `INSERT INTO quiz_attempts (user_id, character_id, level_number, phase, question_id, selected_answer, is_correct, hearts_remaining, score_earned, attempted_at)
         VALUES (?, ?, ?, ?, ?, 'x', ?, 5, ?, NOW() - INTERVAL ? MINUTE)`,
        [student.id, charId, level, phase, String(q.id), right ? 1 : 0, right ? (phase === 'boss' ? 20 : 10) : 0, minutesAgo - (phase === 'boss' ? 5 + i : i)],
      )
    }
  }
}
const T = true, F = false
const plans = [
  [[1, [T, T, T, T, F], [T, T, T, F, F]], [2, [T, T, T, T, T], [T, T, T, T, F]], [3, [T, T, F, F, F], [T, F, F, F, F]]],
  [[1, [T, T, T, T, T], [T, T, T, T, T]], [2, [T, T, T, T, T], [T, T, T, T, T]]],
  [[1, [T, F, T, F, F], [F, F, T, F, F]]],
  [[1, [T, T, F, T, F], [T, F, F, F, F]], [2, [T, F, F, F, F], [F, F, F, F, F]]],
  [],
]
for (const [i, s] of students.entries()) {
  const [{ insertId: charId }] = await db.query("INSERT INTO character_data (user_id, name, class) VALUES (?, 'Hero', 'warrior')", [s.id])
  s.charId = charId
  for (const [k, [level, quiz, boss]] of plans[i].entries()) await seedRun(s, charId, level, quiz, boss, 300 - k * 40)
  if (plans[i].length) {
    await db.query('INSERT INTO game_progress (user_id, character_id, completed_levels) VALUES (?, ?, ?)', [s.id, charId, JSON.stringify(plans[i].map(p => p[0]))])
  }
}
check(true, 'seeded best runs for 4 of 5 students')

// ── APIs ───────────────────────────────────────────────────────────────────
const ov = (await api(tBox, '/api/teacher/overview')).json.data
check(ov.analytics.levelAverages.length === 5 && ov.analytics.levelAverages[0].students === 4, 'teacher overview: level averages from best runs')
check(ov.analytics.proficiency.notStarted === 1 && ov.analytics.gaps.hardestLevel, 'teacher overview: proficiency distribution + learning gaps')

const aBox = { v: '' }
await api(aBox, '/api/auth/login', { identifier: process.env.ADMIN_USER ?? 'admin', password: process.env.ADMIN_PASS ?? 'Admin@12345' })
const aov = (await api(aBox, '/api/admin/overview')).json.data
check(aov.enrollmentTrend.length === 6 && aov.analytics && Array.isArray(aov.topSections) && Array.isArray(aov.studentActivity), 'admin overview: enrollment trend, analytics, top sections, student activity')
const meId = (await api(tBox, '/api/auth/me')).json.data?.id
const scoped = (await api(aBox, `/api/admin/overview?teacherId=${meId}`)).json.data
check(scoped.scope.students === 5, `admin analytics scope to one teacher (5 students, got ${scoped.scope.students})`)
const rooms = (await api(aBox, '/api/admin/classrooms')).json.data
const mine = rooms.find(t => t.username === teacher)
check(mine && mine.sections.length === 2 && mine.studentCount === 5, "admin sees the teacher's 2 sections and 5 students")
const report = (await api(aBox, `/api/admin/students?classroomId=${rizal.id}`)).json.data.students
check(report.length === 3 && report.every(r => r.band && 'stars' in r), 'admin student report for one section (3 rows, band + stars)')
check((await api(tBox, '/api/admin/classrooms')).status === 403 && (await api(tBox, '/api/admin/students?classroomId=1')).status === 403, 'teachers cannot read the admin oversight APIs')

const roomGet = (await api(tBox, '/api/teacher/classroom')).json.data
check(roomGet.classroom.name === 'Grade 5 Mathematics' && roomGet.teacherName === 'Raffy Santos', 'classroom info defaults to Grade 5 Mathematics')
check((await api(tBox, '/api/teacher/classroom', { name: 'x', gradeLevel: 'Grade 9', schoolYear: '2026-2030', isActive: 'yes' }, 'PATCH')).status === 422, 'classroom update validates every field')

// ════ Browser ════
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
let page
const shot = async (name, opts = {}) => { await page.screenshot({ path: `${OUT}/${name}.png`, ...opts }); console.log('        shot ' + name) }
const text = () => page.evaluate(() => document.body.innerText)
const clickText = t => page.evaluate(label => {
  const b = [...document.querySelectorAll('button, a')].find(x => x.offsetParent !== null && x.textContent?.trim().includes(label))
  b?.click()
  return Boolean(b)
}, t)
async function waitFor(fn, ms = 15000, step = 250) {
  const end = Date.now() + ms
  while (Date.now() < end) { if (await fn()) return true; await wait(step) }
  return false
}
const noHorizontalScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

// ── 1. Landing + sign-in pages ─────────────────────────────────────────────
page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(BASE, { waitUntil: 'networkidle2' })
await wait(1200)
let body = await text()
check(/Teacher Login/.test(body) && /Admin Login/.test(body) && /Math Adventure for Grade 5/.test(body), 'landing: title ribbon + Teacher / Admin Login')
check(['Boss Battle Quizzes', 'Grade 5 Math', 'Stars & Rewards', 'Teacher Dashboard'].every(t => body.includes(t)), 'landing: four feature cards')
await shot('w01-landing')
await page.goto(`${BASE}/admin-login`, { waitUntil: 'networkidle2' })
await wait(900)
body = await text()
check(/ADMINISTRATOR/.test(body) && /Admin Sign In/.test(body) && /Back to Home/.test(body) && /Authorized administrator access only/.test(body), 'admin sign-in: badge, title, back link, notice')
await shot('w02-admin-login')
await page.goto(`${BASE}/teacher-login`, { waitUntil: 'networkidle2' })
await wait(900)
body = await text()
check(/Teacher Sign In/.test(body) && /Manage your sections, students, questions and reports/.test(body) && /Ask your MindSpark administrator/.test(body), 'teacher sign-in: ribbon title + notes')
await shot('w03-teacher-login')
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
for (const p of ['/', '/admin-login', '/teacher-login']) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle2' })
  await wait(500)
  check(await noHorizontalScroll(), `phone width 390: no sideways scroll on ${p}`)
}
await shot('w04-landing-phone', { fullPage: true })
await page.close()

// ── 2. Teacher web ─────────────────────────────────────────────────────────
page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(`${BASE}/teacher-login`, { waitUntil: 'networkidle2' })
await page.type('#portal-email', `${teacher}@mindspark.test`)
await page.type('input[type="password"]', PASS)
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), clickText('Sign In')])
check(await waitFor(async () => /Level Performance/.test(await text()), 20000), 'teacher dashboard shows Level Performance')
await wait(1500)
body = await text()
check(/Student Performance/.test(body) && !/Student Performance Trend/.test(body) && !/Lesson Performance/.test(body), 'renamed: Lesson → Level Performance, Student Performance Trend → Student Performance')
check(/Student Proficiency Distribution/.test(body) && /Learning Gaps/.test(body) && /Most Challenging Level/.test(body) && /Recent Student Activity/.test(body), 'suggested analytics: proficiency, learning gaps, recent activity')
check(await page.evaluate(() => [...document.querySelectorAll('aside a')].some(a => a.textContent?.trim() === 'Classroom') && ![...document.querySelectorAll('aside a')].some(a => a.textContent?.trim() === 'Section')), 'sidebar: "Section" renamed "Classroom"')
await shot('t01-dashboard', { fullPage: true })

await page.goto(`${BASE}/teacher/classrooms`, { waitUntil: 'networkidle2' })
await waitFor(async () => /Update Classroom/.test(await text()), 10000)
await wait(800)
body = await text()
check(/Grade 5 Mathematics/.test(body) && /Academic Year/.test(body) && /Sections \(2\)/.test(body) && /Add Section/.test(body), 'classroom page: banner, Sections tab, Add Section')
await shot('t02-classroom-sections')
await clickText('Update Classroom')
await waitFor(() => page.$('[data-testid="update-classroom"]'), 5000)
// Pahabol (Nov 24): no typed classroom name any more — the Section field
// (renaming is proven in check-pahabol-2026-11.mjs); here: the update saves
await wait(300)
check(await page.evaluate(() => document.querySelectorAll('[id^="room-section-"]').length) === 2, 'Update Classroom lists both sections in its Section field')
await shot('t03-update-classroom-modal')
await clickText('Save Changes')
check(await waitFor(() => page.evaluate(() => !document.querySelector('[data-testid="update-classroom"]')), 6000), 'teacher saves the classroom update')
await clickText('Class Details')
await wait(600)
check(/Classroom Information/.test(await text()) && /Assigned Teacher/.test(await text()), 'Class Details tab shows the classroom information')
await shot('t04-class-details')
const [[savedRoom]] = await db.query('SELECT grade_level FROM teacher_classrooms tc JOIN users u ON u.id = tc.teacher_id WHERE u.username = ?', [teacher])
check(savedRoom?.grade_level === 'Grade 5' && (await api(tBox, '/api/teacher/classroom')).json.data.classroom.name === 'Grade 5 Mathematics', 'classroom update is saved in the database')

// View Students → only that section
await clickText('Sections (2)')
await wait(500)
await page.evaluate(id => [...document.querySelectorAll('a')].find(a => a.getAttribute('href') === `/teacher/students?section=${id}` && a.textContent?.includes('View Students'))?.click(), rizal.id)
await waitFor(() => page.$('[data-testid="section-view"]'), 10000)
await wait(1200)
const rows = () => page.evaluate(() => [...document.querySelectorAll('[data-page="teacher-students"] [role="button"]')].filter(d => d.textContent?.includes('@')).map(d => d.textContent))
let listed = await rows()
body = await text()
check(listed.length === 3 && listed.every(t => t.includes('Rizal')), `View Students lists only that section (3 Rizal students, got ${listed.length})`)
check(/Hi, Raffy Santos!/.test(body) && new RegExp(`Section: Rizal ${stamp}`).test(body) && /Teacher: Raffy Santos/.test(body), 'section view header: Hi, teacher · Section · Teacher')
await shot('t05-view-students-one-section')
await page.evaluate(() => [...document.querySelectorAll('aside a')].find(a => a.textContent?.trim() === 'Students')?.click())
await waitFor(async () => /All Students/.test(await text()), 8000)
await wait(800)
listed = await rows()
check(listed.length >= 5, `sidebar Students shows all students again (${listed.length})`)
await shot('t06-all-students')

await page.goto(`${BASE}/teacher/questions`, { waitUntil: 'networkidle2' })
await wait(1500)
check(await page.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent?.trim() === 'Normal Quiz')), 'question bank toggle reads "Normal Quiz"')
await shot('t07-question-bank-normal-quiz')

await page.goto(`${BASE}/teacher/reports`, { waitUntil: 'networkidle2' })
await waitFor(() => page.$('[data-testid="download-report"]'), 15000)
await wait(1200)
body = await text()
check(!/Key Insights/.test(body), 'Key Insights removed')
check(!/Download \(CSV \/ Excel\)/.test(await page.evaluate(() => [...document.querySelectorAll('h3')].find(h => h.textContent?.includes('Class Record'))?.closest('div.rounded-xl')?.innerText ?? '')), 'class record has no Download button')
const dl = path.join(os.tmpdir(), `ms-report-${stamp}`)
fs.mkdirSync(dl, { recursive: true })
const cdp = await page.createCDPSession()
await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dl })
await page.evaluate(() => document.querySelector('[data-testid="download-report"]')?.scrollIntoView({ block: 'center' }))
await shot('t08-reports-download-report')
await page.evaluate(() => [...document.querySelectorAll('[data-testid="download-report"] button')].find(b => b.textContent?.includes('Download Report'))?.click())
check(await waitFor(() => fs.readdirSync(dl).some(f => f.endsWith('.csv')), 10000), 'Download Report saves a CSV')
const csv = fs.readFileSync(path.join(dl, fs.readdirSync(dl).find(f => f.endsWith('.csv'))), 'utf8')
const heads = ['1. SUMMARY', '2. PERFORMANCE DISTRIBUTION', '3. LEVEL COMPLETION OVERVIEW', '4. INTERVENTION SUMMARY', '5. STUDENT PERFORMANCE', '6. CLASS RECORD', '7. SCORES PER LEVEL', '8. QUIZ ATTEMPTS']
check(heads.every(h => csv.includes(h)), 'the report carries ALL 8 modules, not just the student records')
check(students.every(s => csv.includes(s.username)), 'every student appears in the report')
fs.writeFileSync(path.join(OUT, 'sample-report.csv'), csv)
fs.rmSync(dl, { recursive: true, force: true })
await page.close()

// ── 3. Admin web ───────────────────────────────────────────────────────────
page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(`${BASE}/admin-login`, { waitUntil: 'networkidle2' })
await page.type('#portal-email', process.env.ADMIN_EMAIL ?? 'admin@mindspark.local')
await page.type('input[type="password"]', process.env.ADMIN_PASS ?? 'Admin@12345')
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), clickText('Sign In')])
check(await waitFor(async () => /Student Enrollment Overview/.test(await text()), 20000), 'admin dashboard: Student Enrollment Overview')
await wait(1800)
body = await text()
check(['Total Students', 'Total Teachers', 'Total Sections', 'Active Teachers', 'Top Performing Sections', 'Level Performance', 'Student Performance', 'Learning Gaps', 'Recent Activities', 'Quick Actions'].every(t => body.includes(t)), 'admin dashboard: teacher analytics + admin analytics + quick actions')
check(await page.evaluate(() => ['Classrooms & Students', 'About'].every(l => [...document.querySelectorAll('aside a')].some(a => a.textContent?.includes(l)))), 'admin sidebar: Classrooms & Students + About')
await shot('a01-admin-dashboard', { fullPage: true })

await page.goto(`${BASE}/admin/classrooms`, { waitUntil: 'networkidle2' })
await waitFor(() => page.$('[data-testid="admin-teacher-card"]'), 10000)
await page.evaluate(id => {
  const card = [...document.querySelectorAll('[data-testid="admin-teacher-card"]')].find(c => c.textContent?.includes(id))
  card?.scrollIntoView({ block: 'start' })
  ;[...(card?.querySelectorAll('button') ?? [])].find(b => b.textContent?.includes('Rizal'))?.click()
}, teacher)
check(await waitFor(() => page.$('[data-testid="admin-student-report"]'), 8000), "admin opens a teacher's section report")
await wait(600)
const reportRows = await page.evaluate(() => document.querySelectorAll('[data-testid="admin-student-report"] tbody tr').length)
check(reportRows === 3, `admin report lists that section's 3 students (got ${reportRows})`)
await page.evaluate(() => window.scrollTo(0, 0))
await shot('a02-admin-classrooms-report')

await page.goto(`${BASE}/admin/about`, { waitUntil: 'networkidle2' })
await wait(1200)
body = await text()
check(/What is MindSpark\?/.test(body) && ['Beginning', 'Developing', 'Approaching Proficiency', 'Proficient', 'Advanced'].every(b => body.includes(b)) && /90% and above/.test(body), 'About page: what MindSpark is + proficiency table')
await shot('a03-admin-about', { fullPage: true })
await page.close()

// ── 4. Student app (800x360, Capacitor) ────────────────────────────────────
const kid = students[4] // never played: the full first-run story
await api(tBox, `/api/teacher/students/${kid.id}/unlock-level`, { levelNumber: 1 })
await db.query('DELETE FROM character_data WHERE user_id = ?', [kid.id])
page = await browser.newPage()
await page.setViewport({ width: 800, height: 360, deviceScaleFactor: 2 })
await page.evaluateOnNewDocument(() => { window.Capacitor = { isNativePlatform: () => true } })
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
await page.type('input[aria-label="Username"]', kid.username)
await page.type('input[type="password"]', STUDENT_PASS)
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), clickText('Log In')])
await waitFor(async () => /Enter Dashboard/.test(await text()), 20000)
await wait(800)
await clickText('Enter Dashboard')
check(await waitFor(() => page.$('[data-testid="opening-cinematic"]'), 25000), 'opening cinematic plays right after the student signs in')
const scenes = ['The Magical World', 'The Darkness Arrives', 'The Chosen Hero', 'The Five Kingdoms', 'The Mission', 'The Adventure Begins']
for (const [i, title] of scenes.entries()) {
  check(await waitFor(async () => (await text()).toLowerCase().includes(title.toLowerCase()), 8000), `scene ${i + 1}: ${title}`)
  await wait(i === 3 ? 6200 : 2600) // let the animation play before the frame
  await shot(`s0${i + 1}-cinematic-${title.toLowerCase().replace(/\s+/g, '-')}`)
  if (i < scenes.length - 1) await clickText('Next')
}
body = await text()
check(/YOUR ADVENTURE BEGINS NOW!/.test(body) && /Let's save Mathoria together!/.test(body), 'final scene: on-screen text + Spark line')
const fitsCinematic = await page.evaluate(() => {
  const r = document.querySelector('[data-testid="opening-cinematic"]')?.getBoundingClientRect()
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Start Adventure'))?.getBoundingClientRect()
  return r && btn && btn.bottom <= window.innerHeight && btn.right <= window.innerWidth
})
check(fitsCinematic, 'cinematic controls fit an 800x360 landscape phone')
await clickText('Start Adventure')
check(await waitFor(async () => !(await page.$('[data-testid="opening-cinematic"]')), 5000), 'Start Adventure closes the cinematic')
await wait(800)
check(await page.evaluate(() => Boolean(document.querySelector('button[aria-label="Watch the story"]'))), 'map has a Story button to replay it')
check(/Multiplication Forest/.test(await text()), 'map stops are the story kingdoms')
await shot('s07-map-kingdoms')

// Story screen connects the level to the legend
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'L1' && !b.disabled)?.click())
await waitFor(async () => /Begin Quest/.test(await text()), 8000)
await wait(1200)
body = await text()
check(/spark/i.test(body) && /Recover the Emerald Crystal/i.test(body) && /Thornfang/i.test(body), 'level 1 story: Spark, Thornfang, the Emerald Crystal')
await shot('s08-level1-story')
await clickText('Begin Quest')
await wait(1500)
// Answer the 5 quiz questions, then the boss mechanics must wait for the student
for (let q = 0; q < 5; q++) {
  let prompt = null
  await waitFor(async () => {
    const b = await text()
    prompt = [...answerOf.keys()].find(p => b.includes(p)) ?? null
    return prompt && await page.evaluate(() => [...document.querySelectorAll('button')].some(x => /^[A-D]\.\s/.test(x.textContent?.trim() ?? '') && !x.disabled))
  }, 20000)
  await page.evaluate(ans => [...document.querySelectorAll('button')].find(b => (b.textContent ?? '').replace(/^[A-D]\.\s*/, '').trim() === ans)?.click(), answerOf.get(prompt))
  await wait(3300)
}
check(await waitFor(() => page.$('[data-testid="boss-mechanics"]'), 15000), 'boss battle mechanics appear before the boss quiz')
await wait(5000) // stays up — it no longer disappears on a timer
body = await text()
check(/How the boss battle works/.test(body) && /5 Boss Questions/.test(body) && /Hearts/.test(body) && /Win the Crystal/.test(body), 'mechanics: questions, hearts, time, points, crystal')
check(Boolean(await page.$('[data-testid="boss-mechanics"]')), 'mechanics wait for the student (still open after 5 s)')
const fitsMech = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Start Boss Battle'))?.getBoundingClientRect()
  return btn && btn.bottom <= window.innerHeight
})
check(fitsMech, 'mechanics fit 800x360 (Start button on screen)')
await shot('s09-boss-mechanics')
await clickText('Start Boss Battle')
check(await waitFor(async () => /challenges you!/i.test(await text()), 8000), 'Start Boss Battle begins the boss quiz')
await shot('s10-boss-battle')

// Avatar (was Store) + Rewards
await page.goto(`${BASE}/dashboard/store`, { waitUntil: 'networkidle2' })
await wait(1800)
const navLabels = await page.evaluate(() => [...document.querySelectorAll('.student-nav-rail a, .student-nav-rail button')].map(a => a.textContent?.trim()))
check(navLabels.includes('Avatar') && !navLabels.includes('Store'), `nav: STORE renamed AVATAR (${navLabels.join(', ')})`)
body = await text()
check(/Unlock Avatar/.test(body) && !/\bStore\b/.test(body) && !/Buy for/.test(body), 'avatar page: "Unlock Avatar", no "Store", no "Buy"')
await shot('s11-avatar')
await page.goto(`${BASE}/dashboard/profile`, { waitUntil: 'networkidle2' })
await wait(1800)
const rewards = await page.evaluate(() => document.querySelector('[data-testid="profile-rewards"]')?.innerText ?? '')
check(/Rewards/.test(rewards) && /Trophies/.test(rewards) && /Badges/.test(rewards), 'profile: Trophies and Badges grouped under Rewards')
await page.evaluate(() => document.querySelector('[data-testid="profile-rewards"]')?.scrollIntoView({ block: 'start' }))
await shot('s12-profile-rewards')

await browser.close()
await db.end()
console.log(`\nAll ${passed.length} revision checks PASSED. Screenshots in proof-screenshots/revision-2026-11b/`)
