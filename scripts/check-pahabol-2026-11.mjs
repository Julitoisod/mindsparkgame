/**
 * Proves the panel's "pahabol" minor revisions (pahabol-minor-revised.docx,
 * Nov 24) against a running server, screenshotting each into
 * proof-screenshots/pahabol-2026-11/:
 *   1. Classroom → Class Details: "Classroom Name" is now the Section
 *   2. Update Classroom: Section field, editable, where Classroom Name was;
 *      the read-only "Sections" field is gone
 *   3. Admin and teacher sign in with their EMAIL, not a username
 *   4. Last / First / Middle name — admin profile, teacher account, admin's
 *      new-teacher form and Edit — instead of one Full name box
 *
 *   1. npm run dev   (MySQL running)
 *   2. node scripts/check-pahabol-2026-11.mjs
 *
 * Local DB only: creates throwaway teachers and one section.
 */
import puppeteer from 'puppeteer-core'
import mysql from 'mysql2/promise'
import fs from 'node:fs'
import path from 'node:path'
import { createTeacher } from './lib/teacher-account.mjs'

const CHROME = process.env.CHROME_PATH
  ?? 'C:/Users/ISOD/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'
const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@mindspark.local'
const ADMIN_PASS = process.env.ADMIN_PASS ?? 'Admin@12345'
const OUT = path.resolve(import.meta.dirname, '../proof-screenshots/pahabol-2026-11')
const stamp = Date.now().toString(36)
const PASS = 'Passw0rd123'
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

// ════ Setup: an "older" teacher (only a full name stored) with one section ═
const teacher = `ph${stamp}`
const teacherEmail = `${teacher}@mindspark.test`
await createTeacher(BASE, { username: teacher, email: teacherEmail, password: PASS })
const db = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'mindsparkgame', charset: 'utf8mb4' })
await db.query('UPDATE users SET full_name = ?, last_name = NULL, first_name = NULL, middle_name = NULL WHERE username = ?', ['Shea L. Manzano', teacher])
const tBox = { v: '' }
check((await api(tBox, '/api/auth/login', { identifier: teacherEmail, password: PASS, portal: 'teacher' })).status === 200, 'API: a teacher signs in with their email')
const section = (await api(tBox, '/api/teacher/classrooms', { name: `Bonifacios ${stamp}`, schoolYear: '2026-2027' })).json.data
check(section?.id > 0, 'teacher has one section')
// The student edit route now shares readNameParts: same behaviour as before
const kid = (await api(tBox, '/api/teacher/students', { classroomId: section.id, lastName: 'Santos', firstName: 'Ana', middleName: '', username: `pk${stamp}`, password: 'hero12345' })).json.data
const kidEdit = await api(tBox, `/api/teacher/students/${kid.id}`, { lastName: ' Reyes ', firstName: 'Ana  Marie', middleName: 'B.' }, 'PATCH')
const [[kidRow]] = await db.query('SELECT full_name, last_name, first_name FROM users WHERE id = ?', [kid.id])
check(kidEdit.status === 200 && kidRow.full_name === 'Ana Marie B. Reyes' && kidRow.last_name === 'Reyes' && kidRow.first_name === 'Ana Marie', 'student name edit: parts trimmed, full name recomposed')
check((await api(tBox, `/api/teacher/students/${kid.id}`, { lastName: 'x'.repeat(61) }, 'PATCH')).status === 422, 'student name edit still refuses a part over 60 characters')

// ════ API guarantees ═══════════════════════════════════════════════════════
const noSuch = await api({ v: '' }, '/api/auth/login', { identifier: `nobody${stamp}@mindspark.test`, password: 'whatever1', portal: 'teacher' })
const wrongPw = await api({ v: '' }, '/api/auth/login', { identifier: teacherEmail, password: 'wrong-pass1', portal: 'teacher' })
check(noSuch.status === 401 && wrongPw.status === 401 && noSuch.json.message === wrongPw.json.message && noSuch.json.message === 'Invalid email or password',
  'sign-in gives one message for "no such email" and "wrong password" (no account enumeration)')
const acct = (await api(tBox, '/api/account')).json.data
check(acct.lastName === 'Manzano' && acct.firstName === 'Shea' && acct.middleName === 'L.', 'older account: Last / First / Middle prefilled from "Shea L. Manzano"')
check((await api(tBox, '/api/account', { lastName: 'Manzano', firstName: ' ', middleName: '' }, 'PATCH')).status === 400, 'account edit refuses a blank first name')
const aBox = { v: '' }
check((await api(aBox, '/api/auth/login', { identifier: ADMIN_EMAIL, password: ADMIN_PASS, portal: 'admin' })).status === 200, 'API: the admin signs in with their email')
check((await api(aBox, '/api/admin/teachers', { username: `px${stamp}`, email: `px${stamp}@mindspark.test`, password: PASS })).status === 400, 'new teacher without Last / First name is refused')

// ════ Browser ═══════════════════════════════════════════════════════════════
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
async function retype(selector, value) {
  await page.focus(selector)
  await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control')
  await page.keyboard.press('Backspace')
  await page.type(selector, value)
}
/** [label, value] of every field in the account edit form (textContent: innerText is CSS-uppercased). */
const accountFields = () => page.evaluate(() => [...document.querySelectorAll('[data-testid="account-edit"] label')]
  .map(l => [l.querySelector('span')?.textContent ?? '', l.querySelector('input')?.value ?? '']))
/** Name cell of @username's Teacher Management row ('' until it shows). Row-scoped: earlier runs leave look-alike names. */
const teacherRowName = username => page.evaluate(u =>
  [...document.querySelectorAll('tbody tr')].find(tr => tr.textContent?.includes(`@${u}`))?.querySelector('td p')?.textContent ?? '', username)
const signIn = async (portal, email, password) => {
  await page.goto(`${BASE}/${portal}-login`, { waitUntil: 'networkidle2' })
  await page.type('#portal-email', email)
  await page.type('input[type="password"]', password)
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), clickText('Sign In')])
}

// ── Item 3: the sign-in pages ask for Email ────────────────────────────────
page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
for (const portal of ['teacher', 'admin']) {
  await page.goto(`${BASE}/${portal}-login`, { waitUntil: 'networkidle2' })
  await wait(900)
  const field = await page.evaluate(() => ({
    label: document.querySelector('label[for="portal-email"]')?.textContent,
    type: document.querySelector('#portal-email')?.getAttribute('type'),
    username: [...document.querySelectorAll('label')].some(l => /username/i.test(l.textContent ?? '')),
  }))
  check(field.label === 'Email' && field.type === 'email' && !field.username, `${portal} sign-in: the field is "Email" (type=email), no "Username"`)
  await shot(`p0${portal === 'teacher' ? 1 : 2}-${portal}-login-email`)
}
await page.goto(`${BASE}/teacher-login`, { waitUntil: 'networkidle2' })
await page.type('#portal-email', teacher)
await page.type('input[type="password"]', PASS)
await clickText('Sign In')
check(await waitFor(async () => /Enter a valid email address/.test(await text()), 4000) && page.url().includes('/teacher-login'), 'a username in the Email box is caught before sign-in')
await signIn('teacher', teacherEmail, PASS)
check(await waitFor(() => page.url().includes('/teacher/dashboard'), 15000), 'teacher signs in with their email in the real page')

// ── Items 1 + 2: Classroom → Section ───────────────────────────────────────
await page.goto(`${BASE}/teacher/classrooms`, { waitUntil: 'networkidle2' })
await waitFor(async () => /Update Classroom/.test(await text()), 10000)
await clickText('Class Details')
await wait(600)
let details = await page.evaluate(() => document.querySelector('[data-testid="class-details"]')?.textContent ?? '')
check(details.includes('Section') && details.includes(`Bonifacios ${stamp}`) && !details.includes('Classroom Name'), 'Class Details: "Section: Bonifacios", no "Classroom Name"')
await shot('p03-class-details-section')

await clickText('Update Classroom')
await waitFor(() => page.$('[data-testid="update-classroom"]'), 5000)
await wait(300)
const modal = await page.evaluate(id => {
  const m = document.querySelector('[data-testid="update-classroom"]')
  const labels = [...m.querySelectorAll('label, span')].map(l => l.textContent?.trim())
  return {
    firstLabel: m.querySelector('label')?.textContent?.trim(),
    value: document.querySelector(`#room-section-${id}`)?.value,
    editable: !document.querySelector(`#room-section-${id}`)?.disabled,
    classroomName: labels.includes('Classroom Name *'),
    readOnlySections: labels.includes('Sections'),
  }
}, section.id)
check(modal.firstLabel === 'Section *' && modal.value === `Bonifacios ${stamp}` && modal.editable, 'Update Classroom: first field is "Section *", editable, holding the section name')
check(!modal.classroomName && !modal.readOnlySections, 'Update Classroom: no "Classroom Name", and the read-only "Sections" field moved up into it')
await retype(`#room-section-${section.id}`, `Bonifacio ${stamp}`)
await shot('p04-update-classroom-section')
await clickText('Save Changes')
check(await waitFor(() => page.evaluate(() => !document.querySelector('[data-testid="update-classroom"]')), 6000), 'Update Classroom saves')
details = await page.evaluate(() => document.querySelector('[data-testid="class-details"]')?.textContent ?? '')
const [[renamed]] = await db.query('SELECT name FROM classrooms WHERE id = ?', [section.id])
check(renamed.name === `Bonifacio ${stamp}` && details.includes(`Bonifacio ${stamp}`), 'the section is renamed in the database and on the page')
await shot('p05-section-renamed')

// ── Item 4 (teacher): My Account edits Last / First / Middle ──────────────
await page.goto(`${BASE}/teacher/account#edit`, { waitUntil: 'networkidle2' })
await waitFor(() => page.$('[data-testid="account-edit"]'), 10000)
await wait(400)
let fields = await accountFields()
check(JSON.stringify(fields.slice(0, 3)) === JSON.stringify([['Last name', 'Manzano'], ['First name', 'Shea'], ['Middle name', 'L.']]) && !fields.some(([l]) => /full name/i.test(l)),
  'teacher account: Last / First / Middle name (prefilled), no Full name')
await shot('p06-teacher-account-names')
await clickText('Save Changes')
await wait(1500)
const [[tRow]] = await db.query('SELECT full_name, last_name, first_name, middle_name FROM users WHERE username = ?', [teacher])
check(tRow.last_name === 'Manzano' && tRow.first_name === 'Shea' && tRow.middle_name === 'L.' && tRow.full_name === 'Shea L. Manzano', 'teacher account saves the three parts; the display name is composed from them')
await page.close()

// ── Item 4 (admin): profile, new teacher, Edit ────────────────────────────
page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await signIn('admin', ADMIN_EMAIL, ADMIN_PASS)
check(await waitFor(() => page.url().includes('/admin/dashboard'), 15000), 'admin signs in with their email in the real page')
await page.goto(`${BASE}/admin/profile#edit`, { waitUntil: 'networkidle2' })
await waitFor(() => page.$('[data-testid="account-edit"]'), 10000)
await wait(400)
fields = await accountFields()
check(fields.slice(0, 3).map(([l]) => l).join('|') === 'Last name|First name|Middle name' && !fields.some(([l]) => /full name/i.test(l)), 'admin profile: Last / First / Middle name, no Full name')
await shot('p07-admin-profile-names')

await page.goto(`${BASE}/admin/teachers`, { waitUntil: 'networkidle2' })
await waitFor(async () => /Add Teacher/.test(await text()), 10000)
await clickText('Add Teacher')
await waitFor(() => page.$('#new-lastName'), 5000)
const newLabels = await page.evaluate(() => [...document.querySelectorAll('form label')].map(l => l.textContent))
check(['Last name', 'First name', 'Middle name'].every(l => newLabels.includes(l)) && !newLabels.includes('Full name'), 'new teacher account: Last / First / Middle name, no Full name')
const newcomer = `pn${stamp}`
for (const [id, value] of [['lastName', 'Dela Cruz'], ['firstName', 'Juan Miguel'], ['middleName', 'C.'], ['username', newcomer], ['email', `${newcomer}@mindspark.test`], ['password', PASS]]) {
  await page.type(`#new-${id}`, value)
}
await shot('p08-new-teacher-form')
await clickText('Create Account')
check(await waitFor(async () => (await teacherRowName(newcomer)) === 'Juan Miguel C. Dela Cruz', 8000), 'the new teacher is listed as "Juan Miguel C. Dela Cruz"')
const [[nRow]] = await db.query('SELECT last_name, first_name, middle_name FROM users WHERE username = ?', [newcomer])
check(nRow.last_name === 'Dela Cruz' && nRow.first_name === 'Juan Miguel' && nRow.middle_name === 'C.', 'the new teacher is saved as Last / First / Middle')

// Edit (the Shea teacher): the three parts, then save a change
await page.evaluate(u => {
  const row = [...document.querySelectorAll('tbody tr')].find(tr => tr.textContent?.includes(`@${u}`))
  ;[...row.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Edit')?.click()
}, teacher)
await wait(500)
const editPanel = () => page.evaluate(u => {
  const row = [...document.querySelectorAll('tbody tr')].find(tr => tr.textContent?.includes(`@${u}`))
  return [...row.querySelectorAll('label')].map(l => [l.textContent, l.nextElementSibling?.value ?? ''])
}, teacher)
const edit = await editPanel()
check(JSON.stringify(edit.slice(0, 3)) === JSON.stringify([['Last name', 'Manzano'], ['First name', 'Shea'], ['Middle name', 'L.']]) && !edit.some(([l]) => /full name/i.test(l)),
  "admin's Edit: Last / First / Middle name, no Full name")
await page.evaluate(u => [...document.querySelectorAll('tbody tr')].find(tr => tr.textContent?.includes(`@${u}`))?.scrollIntoView({ block: 'center' }), teacher)
await shot('p09-admin-edit-teacher-names')
await page.evaluate(u => {
  const row = [...document.querySelectorAll('tbody tr')].find(tr => tr.textContent?.includes(`@${u}`))
  const input = [...row.querySelectorAll('label')].find(l => l.textContent === 'Middle name').nextElementSibling
  input.focus(); input.select()
}, teacher)
await page.keyboard.press('Backspace')
await page.keyboard.type('Lim')
await page.evaluate(u => {
  const row = [...document.querySelectorAll('tbody tr')].find(tr => tr.textContent?.includes(`@${u}`))
  ;[...row.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Save Changes')?.click()
}, teacher)
check(await waitFor(async () => (await teacherRowName(teacher)) === 'Shea Lim Manzano', 8000), "admin's Edit saves the middle name: listed as \"Shea Lim Manzano\"")
const [[eRow]] = await db.query('SELECT last_name, first_name, middle_name, full_name FROM users WHERE username = ?', [teacher])
check(eRow.last_name === 'Manzano' && eRow.first_name === 'Shea' && eRow.middle_name === 'Lim' && eRow.full_name === 'Shea Lim Manzano', "admin's Edit is saved in the database as Last / First / Middle")

await browser.close()
await db.end()
console.log(`\nAll ${passed.length} pahabol checks PASSED. Screenshots in proof-screenshots/pahabol-2026-11/`)
