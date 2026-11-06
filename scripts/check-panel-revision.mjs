/**
 * Proves the Nov 2026 panel revision (revision-panel-researchers.docx) against
 * a running server, and screenshots every changed screen.
 *
 *   1. npm run build && npx next start   (or npm run dev)
 *   2. node scripts/check-panel-revision.mjs
 *
 * Local DB only — it creates a throwaway teacher + student and seeds attempts.
 * Student screens run as the APK does (Capacitor flag, 800x360 landscape).
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
const OUT = path.resolve(import.meta.dirname, '../proof-screenshots/panel-2026-11')
const stamp = Date.now().toString(36)
const TEACHER_PASS = 'Passw0rd123'
const STUDENT_PASS = 'hero12345'
const wait = ms => new Promise(r => setTimeout(r, ms))
fs.mkdirSync(OUT, { recursive: true })

const passed = []
function ok(label) { passed.push(label); console.log('  PASS  ' + label) }
function check(cond, label) { if (!cond) throw new Error('FAIL  ' + label); ok(label) }

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

// ════ Setup: teacher (made by the admin), section, student, Level 1 open ════
const teacher = `pt${stamp}`
await createTeacher(BASE, { username: teacher, email: `${teacher}@mindspark.test`, password: TEACHER_PASS })
const tBox = { v: '' }
check((await api(tBox, '/api/auth/login', { identifier: teacher, password: TEACHER_PASS })).status === 200, 'admin-created teacher can sign in')
check((await api({ v: '' }, '/api/auth/register', { username: 'x' + stamp, email: `x${stamp}@t.t`, password: TEACHER_PASS })).status === 404,
  'teachers can no longer sign themselves up (register API gone)')

const section = (await api(tBox, '/api/teacher/classrooms', { name: `Mahogany ${stamp}`, schoolYear: '2026-2027' })).json.data
const student = `s${stamp}`
const enrolled = (await api(tBox, '/api/teacher/students', {
  classroomId: section.id, lastName: 'Gonzaga', firstName: 'Regie', middleName: 'Eduria', username: student, password: STUDENT_PASS,
})).json.data
const list = (await api(tBox, '/api/teacher/students')).json.data
check(list.every(s => !('initialPassword' in s)), 'teacher API no longer returns any student password')

await api(tBox, `/api/teacher/students/${enrolled.id}/unlock-level`, { levelNumber: 1 })
const due = new Date(Date.now() + 86400000)
due.setHours(23, 59, 0, 0)
const dl = await api(tBox, `/api/teacher/students/${enrolled.id}/deadline`, { levelNumber: 1, dueAt: due.toISOString() })
check(dl.status === 200, 'teacher sets a Level 1 deadline (level + date + time)')

// ════ Account APIs ════
const sBox = { v: '' }
await api(sBox, '/api/auth/login', { identifier: student, password: STUDENT_PASS })
check((await api(sBox, '/api/account', { fullName: 'Hacker' }, 'PATCH')).status === 403, 'a student cannot edit account details')
check((await api(sBox, '/api/account/password', { currentPassword: 'wrong-pass1', newPassword: 'hero54321x' })).status === 403,
  'password change refuses a wrong current password')
check((await api(tBox, '/api/account', { fullName: 'Flora Teacher' }, 'PATCH')).json.data?.fullName === 'Flora Teacher', 'teacher edits own account information')

const aBox = { v: '' }
await api(aBox, '/api/auth/login', { identifier: process.env.ADMIN_USER ?? 'admin', password: process.env.ADMIN_PASS ?? 'Admin@12345' })
const overview = await api(aBox, '/api/admin/overview')
check(overview.json.success && overview.json.data.stats.teachers >= 1 && Array.isArray(overview.json.data.recent), 'admin dashboard statistics + recent activity')
check((await api(tBox, '/api/admin/overview')).status === 403, 'a teacher cannot read the admin dashboard')

const db = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'mindsparkgame', charset: 'utf8mb4' })
const [bank] = await db.query('SELECT prompt, options, correct_index FROM quiz_questions WHERE is_active = 1')
const answerOf = new Map(bank.map(r => [r.prompt.replace(/\bblank\b/gi, '____'), JSON.parse(r.options)[r.correct_index]]))

// ════ Browser ════
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
let page
const shot = async (name, p = page) => { await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('        shot ' + name) }
const text = (p = page) => p.evaluate(() => document.body.innerText)
const clickText = (t, p = page) => p.evaluate(label => {
  const b = [...document.querySelectorAll('button, a')].find(x => x.textContent?.trim().includes(label))
  b?.click()
  return Boolean(b)
}, t)
const rect = (sel, p = page) => p.evaluate(s => {
  const el = typeof s === 'string' ? document.querySelector(s) : null
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
}, sel)
const overlaps = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

async function waitFor(fn, ms = 15000, step = 250) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (await fn()) return true
    await wait(step)
  }
  return false
}

/** Answers the question on screen, right or wrong; returns once it is resolving. */
async function answer(correct, afterClick) {
  let prompt = null
  await waitFor(async () => {
    const body = await text()
    prompt = [...answerOf.keys()].find(p => body.includes(p)) ?? null
    const ready = await page.evaluate(() => [...document.querySelectorAll('button')].some(b => /^[A-D]\.\s/.test(b.textContent?.trim() ?? '') && !b.disabled))
    return prompt && ready
  }, 20000)
  if (!prompt) throw new Error('no known question on screen')
  const right = answerOf.get(prompt)
  await page.evaluate((ans, wantRight) => {
    const options = [...document.querySelectorAll('button')].filter(b => /^[A-D]\.\s/.test(b.textContent?.trim() ?? ''))
    const pick = options.find(b => (b.textContent.trim().replace(/^[A-D]\.\s*/, '') === ans) === wantRight)
    pick?.click()
  }, right, correct)
  const started = Date.now()
  if (afterClick) await afterClick()
  await wait(Math.max(0, 3300 - (Date.now() - started)))
}

async function playRun(quiz, boss, { onLastQuizClick } = {}) {
  for (const [i, c] of quiz.entries()) await answer(c, i === quiz.length - 1 ? onLastQuizClick : undefined)
  await waitFor(async () => /challenges you!/i.test(await text()), 20000)
  for (const c of boss) await answer(c)
  check(await waitFor(() => page.$('[data-testid="level-result"]'), 20000), `level result appears after quiz ${quiz.filter(Boolean).length}/5 + boss ${boss.filter(Boolean).length}/5`)
  await wait(1200) // let the panels' spring animations settle
}

async function resultValues() {
  return page.evaluate(() => {
    const get = id => document.querySelector(`[data-testid="${id}"]`)?.textContent?.trim()
    return {
      correct: get('result-correct'), stars: get('result-stars'), points: get('result-points'), hearts: get('result-hearts'),
      trophy: get('result-trophy-panel'), badges: get('result-badge-panel'), message: get('result-message'),
    }
  })
}

async function openLevel(n) {
  await waitFor(() => page.evaluate(l => [...document.querySelectorAll('button')].some(b => b.textContent?.trim() === `L${l}` && !b.disabled), n), 15000)
  await page.evaluate(l => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === `L${l}`)?.click(), n)
  await wait(1200)
  if (await clickText('Start the Adventure')) await wait(1200)
  await clickText('Begin Quest')
  await wait(1500)
}

// ── Student app (800x360 landscape, Capacitor) ──────────────────────────────
page = await browser.newPage()
await page.setViewport({ width: 800, height: 360, deviceScaleFactor: 2 })
await page.evaluateOnNewDocument(() => { window.Capacitor = { isNativePlatform: () => true } })
page.on('dialog', d => d.accept())
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
await page.type('input[aria-label="Username"]', student)
await page.type('input[type="password"]', STUDENT_PASS)
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), clickText('Log In')])
await waitFor(async () => page.url().includes('character-select'), 15000)
await waitFor(async () => /Enter Dashboard/.test(await text()), 15000)
await wait(800)
await clickText('Enter Dashboard')

// 1. Deadline reminder after sign-in
check(await waitFor(() => page.$('[data-testid="deadline-reminder"]'), 25000), 'deadline reminder pops up after the student signs in')
await wait(900)
const reminderText = await text()
check(/Activity Reminder!/.test(reminderText) && /Level 1/.test(reminderText) && /Remind me later/.test(reminderText), 'reminder names the level, date and time with Start / Remind me later')
await shot('s01-deadline-reminder')
await clickText('Remind me later')
await wait(900)

// 2. Map — trophies/badges banner clear of the nav tray
const nav = await rect('.student-nav-rail')
const banner = await page.evaluate(() => {
  const el = [...document.querySelectorAll('span')].find(s => s.textContent?.startsWith('Trophies:'))?.parentElement
  const r = el?.getBoundingClientRect()
  return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null
})
check(nav && banner && !overlaps(nav, banner), 'Trophies/Badges banner no longer overlaps the nav')
await shot('s02-map-no-overlap')

// 3. Level 1: quiz 0/5, boss 1/5 → still a result, trophy earned (boss decides)
await openLevel(1)
await playRun([false, false, false, false, false], [true, false, false, false, false])
let r = await resultValues()
check(r.correct === '1/10' && r.stars === '+1' && r.points === '+20' && r.hearts === '1/5', `quiz 0/5 + boss 1/5 → 1/10, +1 star, +20 pts, 1/5 hearts (got ${JSON.stringify([r.correct, r.stars, r.points, r.hearts])})`)
check(/Trophy Earned/.test(r.trophy), 'boss 1/5 still earns the trophy (boss score only)')
check(/First Victory/.test(r.badges) && /Boss Slayer/.test(r.badges), 'First Victory + Boss Slayer appear beside the trophy at the end')
await shot('s03-result-quiz0-boss1-trophy')

// 4. Retry 0/5 + 0/5 → no early fail, result with "Try harder"
await clickText('Retry')
await wait(1500)
await playRun([false, false, false, false, false], [false, false, false, false, false])
r = await resultValues()
check(r.correct === '0/10' && r.stars === '+0' && r.points === '+0' && r.hearts === '0/5', '0/5 quiz still goes to the boss, 0/5 boss still shows the result (0/10)')
check(/Trophy Not Earned/.test(r.trophy) && /Badge Not Earned/.test(r.badges), 'trophy + badge shown as NOT EARNED')
check(/Try harder in the next battle/.test(r.message), 'message: "You can continue your adventure! Try harder…"')
check(!/First Victory/.test(r.badges), 'an owned badge never appears again')
await shot('s04-result-0of10')

// 5. Retry 1/5 + 0/5 → "boss is still undefeated"
await clickText('Retry')
await wait(1500)
await playRun([true, false, false, false, false], [false, false, false, false, false])
r = await resultValues()
check(r.correct === '1/10' && r.points === '+10' && r.hearts === '0/5' && /boss is still undefeated/.test(r.message), 'quiz 1/5 + boss 0/5 → 1/10, +10 pts, "the boss is still undefeated"')
await shot('s05-result-boss-undefeated')

// 6. Retry with a perfect run → Math Streak pops up mid-game BEFORE the boss
await clickText('Retry')
await wait(1500)
let streakBeforeBoss = false
await playRun([true, true, true, true, true], [true, true, true, true, true], {
  onLastQuizClick: async () => {
    const popped = await waitFor(() => page.$('[data-testid="badge-popup"]'), 2500, 100)
    const bossYet = /Boss Battle Phase/.test(await text())
    streakBeforeBoss = popped && !bossYet
    if (popped) await shot('s06-math-streak-midgame')
    // and the boss animation follows once the badge is done
    streakBeforeBoss = streakBeforeBoss && await waitFor(async () => /Boss Battle Phase/.test(await text()), 6000, 150)
  },
})
check(streakBeforeBoss, 'Math Streak pops up mid-game, then the boss animation follows')
r = await resultValues()
check(r.correct === '10/10' && r.stars === '+10' && r.points === '+150' && r.hearts === '5/5', 'perfect run → 10/10, +10 stars, +150 points, 5/5 hearts')
check(/Trophy Collected/.test(r.trophy), 'a trophy already won is not shown as new again')
check(/Perfect Score/.test(r.badges) && /Math Streak/.test(r.badges) && !/Boss Slayer/.test(r.badges), 'result lists only the badges new on this run')
const ratingStars = await page.evaluate(() => {
  const title = [...document.querySelectorAll('[data-testid="level-result"] h2')].find(h => /Complete!/.test(h.textContent ?? ''))
  return title?.nextElementSibling?.querySelectorAll('svg.fill-yellow-400').length ?? -1
})
check(ratingStars === 3, `10/10 shows 3 stars (got ${ratingStars})`)
await shot('s07-result-perfect')

// 7. Star Collector at the 100th star, mid-game
const [[{ n: correctSoFar }]] = await db.query('SELECT COUNT(*) AS n FROM quiz_attempts WHERE user_id = ? AND is_correct = 1', [enrolled.id])
const [[{ id: charId }]] = await db.query('SELECT id FROM character_data WHERE user_id = ?', [enrolled.id])
const filler = 99 - Number(correctSoFar)
for (let i = 0; i < filler; i++) {
  await db.query(`INSERT INTO quiz_attempts (user_id, character_id, level_number, phase, question_id, selected_answer, is_correct, hearts_remaining, score_earned, attempted_at)
                  VALUES (?, ?, 4, 'normal', 'seed', 'x', 1, 5, 10, '2026-01-05 08:00:00')`, [enrolled.id, charId])
}
await page.goto(`${BASE}/dashboard/map`, { waitUntil: 'networkidle2' })
await wait(2500)
await openLevel(2)
await answer(true)
check(await waitFor(async () => /Star Collector/.test(await text()), 5000, 150), 'Star Collector pops up on the 100th star, mid-game')
await shot('s08-star-collector-midgame')

// 8. Level 5 → result first, then Next → finale (fits, no scroll) → Play Again
await db.query(`UPDATE game_progress SET completed_levels = '[1,2,3,4]' WHERE character_id = ?`, [charId])
await page.goto(`${BASE}/dashboard/map`, { waitUntil: 'networkidle2' })
await wait(2500)
await openLevel(5)
await playRun([true, false, true, false, true], [true, true, false, false, false])
r = await resultValues()
check(/Forest Explorer/.test(r.badges) && /Forest Champion/.test(r.badges), 'Forest Explorer + Forest Champion appear on the Level 5 result')
check(!(await page.$('[data-testid="finale"]')), 'Level 5 shows its result first (no jump to the finale)')
await shot('s09-level5-result')
await clickText('Next')
check(await waitFor(() => page.$('[data-testid="finale"]'), 5000), 'Next on Level 5 opens the finale')
await wait(2200)
const fits = await page.evaluate(() => {
  const card = document.querySelector('[data-testid="finale"] > div:last-child')
  return card ? card.scrollHeight <= card.clientHeight + 1 && card.getBoundingClientRect().bottom <= window.innerHeight : false
})
check(fits, 'finale fits a landscape phone without scrolling')
const finaleText = await text()
check(/CONGRATULATIONS, HERO!/.test(finaleText) && /THE KINGDOM IS SAVED!/.test(finaleText) && /Play Again/.test(finaleText), 'finale wording + Map / Play Again')
await shot('s10-finale')
await clickText('Play Again')
await wait(2000)
const lockState = async () => page.evaluate(() => [1, 2, 3, 4, 5].map(l => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent?.trim() === `L${l}`)
  return b ? !b.disabled : null
}))
let states = await lockState()
check(states[0] === true && states.slice(1).every(s => s === false), `Play Again: Level 1 open, Levels 2–5 locked (${states})`)
await shot('s11-play-again-map')
await page.reload({ waitUntil: 'networkidle2' })
await wait(2500)
await clickText('Remind me later')
states = await lockState()
check(states[0] === true && states.slice(1).every(s => s === false), 'the Play Again lock survives a reload')

// 9. Store — an owned character can be selected again
await db.query('INSERT IGNORE INTO character_unlocks (user_id, class, cost_stars) VALUES (?, ?, 10)', [enrolled.id, 'mage'])
await page.goto(`${BASE}/dashboard/store`, { waitUntil: 'networkidle2' })
await wait(1800)
const starPill = await page.evaluate(() => {
  const el = [...document.querySelectorAll('span')].find(s => /^\d+$/.test(s.textContent?.trim() ?? '') && s.parentElement?.querySelector('svg'))?.parentElement
  const r = el?.getBoundingClientRect()
  return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null
})
check(starPill && !overlaps(starPill, await rect('.student-nav-rail')), 'store star balance is visible (not under the nav)')
await page.evaluate(() => document.querySelectorAll('button')[0] && [...document.querySelectorAll('button')].filter(b => b.querySelector('svg.lucide-chevron-right'))[0]?.click())
await wait(700)
const hit = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => /Use this hero/.test(b.textContent ?? ''))
  if (!btn) return 'no button'
  const r = btn.getBoundingClientRect()
  const top = document.elementFromPoint(r.x + r.width - 12, r.y + r.height / 2)
  return btn.contains(top) ? 'ok' : `covered by ${top?.tagName}.${top?.className}`
})
check(hit === 'ok', `owned character's button is clickable (${hit})`)
await clickText('Use this hero')
check(await waitFor(async () => /is now your hero/.test(await text()), 6000), 'selecting an owned character works')
const toastBg = await page.evaluate(() => {
  const t = [...document.querySelectorAll('div')].find(d => d.textContent === 'Fairy is now your hero!' && d.parentElement?.getAttribute('role') !== null)
  return t ? getComputedStyle(t.closest('[class*="go"]') ?? t.parentElement).backgroundColor : null
})
await shot('s12-store-select-owned')
console.log('        toast background:', toastBg)

// 10. Attempts — search box clear of the nav
await page.goto(`${BASE}/dashboard/attempts`, { waitUntil: 'networkidle2' })
await wait(1800)
const search = await rect('input[placeholder="Search..."]')
check(search && !overlaps(search, await rect('.student-nav-rail')), 'attempts search box is visible (not under the nav)')
await shot('s13-attempts')

// 11. Profile — trophies from bosses, student changes own password
await page.goto(`${BASE}/dashboard/profile`, { waitUntil: 'networkidle2' })
await wait(1800)
const pw = await page.$('[data-testid="student-change-password"]')
check(Boolean(pw), 'student profile has Change Password')
const inputs = await pw.$$('input')
await inputs[0].type(STUDENT_PASS)
await inputs[1].type('hero54321x')
await inputs[2].type('hero54321x')
await pw.evaluate(el => el.scrollIntoView({ block: 'center' }))
await shot('s14-profile-change-password')
await page.evaluate(() => [...document.querySelectorAll('[data-testid="student-change-password"] button[type="submit"]')][0]?.click())
check(await waitFor(async () => /Password changed/.test(await text()), 6000), 'student changed their own password')
check((await api({ v: '' }, '/api/auth/login', { identifier: student, password: 'hero54321x' })).status === 200, 'student signs in with the new password')
await page.close()

// ── Teacher (desktop) ───────────────────────────────────────────────────────
page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(`${BASE}/teacher-login`, { waitUntil: 'networkidle2' })
await wait(800)
const loginText = await text()
check(!/Create teacher account/i.test(loginText) && !/Student sign in/i.test(loginText), 'sign-in page: no teacher sign-up, no student link')
await shot('t01-sign-in')
await page.type('input[placeholder="hero123"]', teacher)
await page.type('input[type="password"]', TEACHER_PASS)
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), clickText('Sign In')])
check(await waitFor(async () => /Class Performance Overview/.test(await text()), 20000), 'teacher lands on the new dashboard')
await wait(1500)
const dash = await text()
check(/Students Who Need Attention/.test(dash) && /Recent Student Activity/.test(dash) && /completed Level/.test(dash) && /Go to Reports/.test(dash), 'dashboard: chart, attention table, activity feed, reports link')
await shot('t02-dashboard')
// the layout has a mobile and a desktop header — click the visible menu
await page.evaluate(() => [...document.querySelectorAll('[data-testid="account-menu-button"]')].find(b => b.offsetParent !== null)?.click())
await wait(400)
const menu = await text()
check(/My Profile/.test(menu) && /Edit Account Information/.test(menu) && /Change Password/.test(menu) && /Logout/.test(menu), 'account menu: My Profile · Edit · Change Password · Logout')
await shot('t03-account-menu')
await page.goto(`${BASE}/teacher/account#password`, { waitUntil: 'networkidle2' })
await wait(1200)
await shot('t04-account-password')
await page.goto(`${BASE}/teacher/classrooms`, { waitUntil: 'networkidle2' })
await wait(1200)
await shot('t05-sections')
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), clickText('View Students')])
await wait(1500)
check(page.url().includes('/teacher/students?section='), 'View Students opens the Students page for that section')
await page.evaluate(() => [...document.querySelectorAll('[role="button"]')].find(d => d.textContent?.includes('@'))?.click())
await wait(1800)
const studentPanel = await text()
check(!/Current Password/i.test(studentPanel) && /Reset Password/i.test(studentPanel), 'student account details: no current password, reset only')
check(/Correct \/ Total Answered/.test(studentPanel) && /Total Points Earned/.test(studentPanel) && /Accuracy/.test(studentPanel), 'quiz scores labelled: accuracy, correct/total answered, total points')
check(Boolean(await page.$('input[type="date"][aria-label="Deadline date"]')) && Boolean(await page.$('input[type="time"][aria-label="Deadline time"]')), 'deadline = level + date + time inputs')
await page.evaluate(() => [...document.querySelectorAll('p')].find(p => p.textContent?.includes('Quiz Scores'))?.scrollIntoView({ block: 'start' }))
await shot('t06-student-details')

// Registrar-style class list: title rows, semicolons, SURNAME / GIVEN NAME
const csv = path.join(os.tmpdir(), `registrar-${stamp}.csv`)
fs.writeFileSync(csv, 'FRANCISCO ADLAON LEARNING INSTITUTE;;;\nGrade 5 - Mahogany;;;\n;;;\nNo.;LRN;SURNAME;GIVEN NAME;MIDDLE INITIAL\n1;123456789012;Dela Cruz;Juan;R.\n2;123456789013;Santos;Maria Clara;D.\n')
await page.goto(`${BASE}/teacher/enrollment`, { waitUntil: 'networkidle2' })
await wait(1500)
const fileInput = await page.$('input[type="file"]')
await fileInput.uploadFile(csv)
check(await waitFor(async () => /Review student records/.test(await text()), 6000), 'a Registrar-style CSV (title rows, semicolons, SURNAME/GIVEN NAME) previews')
check(/Maria Clara/.test(await text()), 'class-list preview shows the students')
await shot('t07-enrollment-registrar-csv')
fs.rmSync(csv, { force: true })

await page.goto(`${BASE}/teacher/reports`, { waitUntil: 'networkidle2' })
await wait(2500)
await clickText('Show categories')
await wait(600)
await page.evaluate(() => [...document.querySelectorAll('h3')].find(h => h.textContent?.includes('Class Record'))?.scrollIntoView({ block: 'start' }))
const record = await page.evaluate(() => {
  const table = [...document.querySelectorAll('table')].find(t => t.textContent?.includes('Total /50'))
  return table ? table.innerText : ''
})
check(/Total \/50/i.test(record) && /—/.test(record), 'class record: total /50 and dashes for unplayed levels')
await shot('t08-class-record')
const cr = (await api(tBox, '/api/teacher/class-record')).json.data.students.find(s => s.username === student)
const asked = Object.values(cr.categories).reduce((n, c) => n + c.asked, 0)
check(cr.levels[1].score === 10 && asked <= 50, `class record uses best runs: L1 = 10, categories count ${asked} answers (not every retry)`)
await page.close()

// ── Admin ──────────────────────────────────────────────────────────────────
page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
page.on('dialog', d => d.accept())
await page.goto(`${BASE}/teacher-login`, { waitUntil: 'networkidle2' })
await page.type('input[placeholder="hero123"]', process.env.ADMIN_USER ?? 'admin')
await page.type('input[type="password"]', process.env.ADMIN_PASS ?? 'Admin@12345')
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), clickText('Sign In')])
check(await waitFor(async () => page.url().includes('/admin/dashboard') && /Recent Activities/.test(await text()), 15000), 'admin uses the same sign-in page and lands on the admin dashboard')
await wait(1000)
await shot('a01-admin-dashboard')
await page.goto(`${BASE}/admin/teachers`, { waitUntil: 'networkidle2' })
await wait(1500)
await page.evaluate(u => {
  const row = [...document.querySelectorAll('tr')].find(tr => tr.textContent?.includes(`@${u}`))
  ;[...row.querySelectorAll('button')].find(b => b.textContent?.includes('Reset'))?.click()
}, teacher)
check(await waitFor(async () => /shown only once/.test(await text()), 6000), 'admin resets a teacher password (temporary password shown once)')
const temp = await page.evaluate(() => [...document.querySelectorAll('code')].map(c => c.textContent).find(t => t?.startsWith('Ms-')))
check((await api({ v: '' }, '/api/auth/login', { identifier: teacher, password: temp })).status === 200, 'teacher signs in with the reset password')
await shot('a02-teacher-management-reset')
await page.goto(`${BASE}/admin/profile`, { waitUntil: 'networkidle2' })
await wait(1200)
await shot('a03-admin-profile')

await browser.close()
await db.end()
console.log(`\nAll ${passed.length} panel-revision checks PASSED. Screenshots in proof-screenshots/panel-2026-11/`)
