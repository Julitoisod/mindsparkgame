/**
 * Screenshots the real game after a question-bank change: level map subtitles,
 * a live question for each level, and the teacher's question bank page.
 *
 *   1. npm run dev
 *   2. node scripts/seed-questions.mjs --apply
 *   3. node scripts/shoot-quiz-proof.mjs
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

// ── Teacher, section, student, all 5 levels unlocked ─────────────────────────
const teacher = `q${stamp}`
await api('/api/auth/register', { username: teacher, email: `${teacher}@mindspark.test`, password: PASS })
await api('/api/auth/login', { identifier: teacher, password: PASS })
const section = await api('/api/teacher/classrooms', { name: `Grade 5 - Proof ${stamp}`, schoolYear: '2026-2027' })
const student = `s${stamp}`
const enrolled = await api('/api/teacher/students', {
  classroomId: section.data.id, lastName: 'Cruz', firstName: 'Proof', middleName: '', username: student, password: PASS,
})

const db = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'mindsparkgame', charset: 'utf8mb4' })
const [[{ id: teacherId }]] = await db.query('SELECT id FROM users WHERE username = ?', [teacher])
for (let level = 1; level <= 5; level++) {
  await db.query('INSERT INTO teacher_level_unlocks (student_id, level_number, unlocked_by) VALUES (?,?,?)',
    [enrolled.data.id, level, teacherId])
}
const [bank] = await db.query('SELECT prompt FROM quiz_questions WHERE is_active = 1')
await db.end()
const prompts = bank.map(r => r.prompt)

// ── Student plays ────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 })
const shot = async name => { await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('  shot', name) }
const clickText = text => page.evaluate(t => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent?.includes(t))
  b?.click()
  return Boolean(b)
}, text)

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
await page.type('input[placeholder="hero123"]', student)
await page.type('input[type="password"]', PASS)
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), page.click('button[type=submit]')])
await page.goto(`${BASE}/character-select`, { waitUntil: 'networkidle2' })
await page.waitForSelector('input[aria-label="Character name"]')
await page.type('input[aria-label="Character name"]', 'Proof')
await clickText('Enter Dashboard')
await wait(3000)

const shown = []
for (let level = 1; level <= 5; level++) {
  await page.goto(`${BASE}/game`, { waitUntil: 'networkidle2' })
  await wait(3000)
  if (level === 1) await shot('m5-00-level-map')
  await page.evaluate(i => {
    const nodes = [...document.querySelectorAll('button:not([disabled])')].filter(b => b.querySelector('img'))
    nodes[i]?.click()
  }, level - 1)
  await wait(1500)
  await clickText('Start the Adventure'); await wait(1500)
  await clickText('Begin Quest'); await wait(2500)
  const text = await page.evaluate(() => document.body.innerText)
  const hit = prompts.find(p => text.includes(p))
  if (!hit) throw new Error(`Level ${level}: no bank question on screen`)
  shown.push(`L${level}: ${hit}`)
  await shot(`m5-0${level}-level-${level}-question`)
}

// ── Teacher bank page ────────────────────────────────────────────────────────
const teacherPage = await browser.newPage()
await teacherPage.setViewport({ width: 1280, height: 900 })
await teacherPage.setCookie({ name: cookie.split('=')[0], value: cookie.split('=').slice(1).join('='), url: BASE })
await teacherPage.goto(`${BASE}/teacher/questions`, { waitUntil: 'networkidle2' })
await wait(2500)
await teacherPage.screenshot({ path: `${OUT}/m5-06-teacher-bank.png` })
console.log('  shot m5-06-teacher-bank')

await browser.close()
console.log('\nQuestions seen in the live game:\n' + shown.map(s => `  ${s}`).join('\n'))
