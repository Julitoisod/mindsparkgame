/**
 * The student APK is locked to landscape (android:screenOrientation
 * "sensorLandscape"), so every student screen has to fit in roughly 800x360 css
 * pixels. The panel reported the app "scrolling" instead of fitting — this
 * measures each screen at that size and fails if one overflows.
 *
 *   1. npm run dev
 *   2. node scripts/check-app-fit.mjs
 *
 * List screens (profile, store, attempts) scroll on purpose — their content
 * grows with the student's progress — so they are measured but not enforced.
 */
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = process.env.CHROME_PATH
  ?? 'C:/Users/ISOD/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'
const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = path.resolve(import.meta.dirname, '../proof-screenshots')
const wait = ms => new Promise(r => setTimeout(r, ms))
fs.mkdirSync(OUT, { recursive: true })

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

const teacher = `fit${stamp}`
await api('/api/auth/register', { username: teacher, email: `${teacher}@mindspark.test`, password: 'Passw0rd123' })
await api('/api/auth/login', { identifier: teacher, password: 'Passw0rd123' })
const section = await api('/api/teacher/classrooms', { name: `Grade 5 - Fit ${stamp}`, schoolYear: '2026-2027' })
const student = `s${stamp}`
await api('/api/teacher/students', {
  classroomId: section.data.id, lastName: 'Fit', firstName: 'Test', middleName: '',
  username: student, password: PASS,
})

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
// A landscape phone, as the APK presents it
await page.setViewport({ width: 800, height: 360, isMobile: true, deviceScaleFactor: 2 })
await page.evaluateOnNewDocument(() => { window.Capacitor = { isNativePlatform: () => true } })

const clickText = text => page.evaluate(t => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent?.includes(t))
  b?.click()
  return Boolean(b)
}, text)

async function measure(name, { enforce = true } = {}) {
  await wait(1500)
  const m = await page.evaluate(() => {
    const d = document.documentElement
    // The student shell is fixed to the viewport and scrolls INSIDE a container,
    // so a clipped button never shows up as document overflow. Measure both.
    let innerMax = 0
    for (const el of document.querySelectorAll('*')) {
      const diff = el.scrollHeight - el.clientHeight
      if (diff > innerMax && el.clientHeight > 100) innerMax = diff
    }
    return { over: d.scrollHeight - d.clientHeight, innerMax }
  })
  const worst = Math.max(m.over, m.innerMax)
  console.log(`  ${name.padEnd(18)} ${worst > 2 ? `SCROLLS (+${worst}px)` : 'fits'}`)
  await page.screenshot({ path: `${OUT}/fit-${name}.png` })
  if (enforce && worst > 2) throw new Error(`${name} does not fit a landscape phone (+${worst}px)`)
}

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
await measure('login')

await page.type('input[aria-label="Username"]', student)
await page.type('input[type="password"]', PASS)
await clickText('Log In')
await wait(4000)
await page.goto(`${BASE}/character-select`, { waitUntil: 'networkidle2' })
await measure('character-select')

await clickText('Enter Dashboard')
await wait(3000)
await page.goto(`${BASE}/game`, { waitUntil: 'networkidle2' })
await measure('game-map')

for (const screen of ['profile', 'store', 'attempts']) {
  await page.goto(`${BASE}/dashboard/${screen}`, { waitUntil: 'networkidle2' })
  await measure(screen, { enforce: false }) // long lists scroll by design
}

await browser.close()
console.log('\nLandscape fit OK.')
