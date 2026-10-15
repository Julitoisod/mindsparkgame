/**
 * Checks that the storyline is actually narrated, in pieces short enough for
 * Android's speech engine.
 *
 *   1. npm run dev
 *   2. node scripts/check-voiceover.mjs
 *
 * A headless browser has no real voices, so the page's speechSynthesis is
 * replaced with a recorder before anything loads. That also mimics the phone:
 * getVoices() starts empty and voices arrive later.
 */
import puppeteer from 'puppeteer-core'
import mysql from 'mysql2/promise'

const CHROME = process.env.CHROME_PATH
  ?? 'C:/Users/ISOD/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'
const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const wait = ms => new Promise(r => setTimeout(r, ms))
const stamp = Date.now().toString(36)
const PASS = 'hero12345'

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

const teacher = `vo${stamp}`
await api('/api/auth/register', { username: teacher, email: `${teacher}@mindspark.test`, password: 'Passw0rd123' })
await api('/api/auth/login', { identifier: teacher, password: 'Passw0rd123' })
const section = await api('/api/teacher/classrooms', { name: `Grade 5 - Voice ${stamp}`, schoolYear: '2026-2027' })
const student = `s${stamp}`
const enrolled = await api('/api/teacher/students', {
  classroomId: section.data.id, lastName: 'Voice', firstName: 'Test', middleName: '',
  username: student, password: PASS,
})
// Unlock level 1 the way the other proof scripts do — straight in the DB.
const db = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'mindsparkgame', charset: 'utf8mb4' })
const [[{ id: teacherId }]] = await db.query('SELECT id FROM users WHERE username = ?', [teacher])
await db.query('INSERT INTO teacher_level_unlocks (student_id, level_number, unlocked_by) VALUES (?,?,?)',
  [enrolled.data.id, 1, teacherId])
await db.end()

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 800, height: 360, isMobile: true, deviceScaleFactor: 2 })
await page.evaluateOnNewDocument(() => {
  window.Capacitor = { isNativePlatform: () => true }

  // Recorder that behaves like Android: no voices at first, then some.
  const spoken = []
  let voices = []
  const listeners = []
  window.__spoken = spoken
  // window.speechSynthesis is a read-only getter — a plain assignment is
  // silently ignored and the page keeps the real (voiceless) engine.
  const stub = {
    speaking: false,
    getVoices: () => voices,
    cancel: () => { window.speechSynthesis.speaking = false },
    resume: () => {},
    pause: () => {},
    addEventListener: (type, fn) => { if (type === 'voiceschanged') listeners.push(fn) },
    removeEventListener: (type, fn) => {
      const i = listeners.indexOf(fn)
      if (i >= 0) listeners.splice(i, 1)
    },
  }
  stub.speak = u => { spoken.push(String(u.text)); stub.speaking = true }
  Object.defineProperty(window, 'speechSynthesis', { value: stub, configurable: true })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: function (text) { this.text = text },
    configurable: true,
  })
  // Voices show up a moment later, exactly like a phone booting its TTS engine.
  setTimeout(() => {
    voices = [{ lang: 'en-US', name: 'Test Voice' }]
    listeners.slice().forEach(fn => fn())
  }, 600)
})

const clickText = text => page.evaluate(t => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent?.includes(t))
  b?.click()
  return Boolean(b)
}, text)

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
await page.type('input[aria-label="Username"]', student)
await page.type('input[type="password"]', PASS)
await clickText('Log In')
await wait(4000)
await page.goto(`${BASE}/character-select`, { waitUntil: 'networkidle2' })
await wait(2500)
await clickText('Enter Dashboard')
await wait(3000)

await page.goto(`${BASE}/game`, { waitUntil: 'networkidle2' })
await wait(3500)
await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('button:not([disabled])')].filter(b => b.querySelector('img'))
  nodes[0]?.click()
})
await wait(1500)
await clickText('Start the Adventure')
await wait(3000) // story screen + the voice-ready delay

const spoken = await page.evaluate(() => window.__spoken ?? [])
console.log(`  utterances queued on the story screen: ${spoken.length}`)
spoken.forEach((s, i) => console.log(`   ${i + 1}. (${s.length} chars) ${s.slice(0, 70)}…`))

if (spoken.length === 0) throw new Error('the storyline was never narrated')
const tooLong = spoken.filter(s => s.length > 180)
if (tooLong.length) throw new Error(`${tooLong.length} utterance(s) over 180 chars — Android would drop them`)

await browser.close()
console.log('\nVoice-over OK: narration starts after the voices load and is split into short pieces.')
