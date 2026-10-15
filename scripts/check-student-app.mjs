/**
 * Proves how the student APK behaves without needing an emulator.
 *
 * The APK is a Capacitor shell that loads the live site, and the app-only
 * behaviour keys off Capacitor.isNativePlatform() (lib/appTarget.ts). So we
 * load the same pages with that flag faked on and assert:
 *   1. opening the app ("/") lands on the STUDENT login, not the teacher page
 *   2. the student login never offers a teacher route
 *   3. a teacher's credentials are refused inside the student app
 *
 *   node scripts/check-student-app.mjs                 # against the live site
 *   BASE_URL=http://localhost:3000 node scripts/...    # also checks (3)
 */
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = process.env.CHROME_PATH
  ?? 'C:/Users/ISOD/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'
const BASE = process.env.BASE_URL ?? 'https://palegreen-elephant-128101.hostingersite.com'
const OUT = path.resolve(import.meta.dirname, '../proof-screenshots')
const LOCAL = BASE.includes('localhost')
const wait = ms => new Promise(r => setTimeout(r, ms))
fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
// A phone-sized viewport, and Capacitor reporting a native platform — exactly
// what the WebView inside the APK reports.
await page.setViewport({ width: 412, height: 915, isMobile: true, deviceScaleFactor: 2 })
await page.evaluateOnNewDocument(() => {
  window.Capacitor = { isNativePlatform: () => true }
})

// ── 1. The app opens on the student login ────────────────────────────────────
await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' })
// Poll rather than guess: a dev server compiles the page on first hit, so the
// client-side redirect can take several seconds there (it is instant live).
for (let i = 0; i < 30 && !page.url().endsWith('/login'); i++) await wait(500)
const landed = page.url()
console.log('  app opened "/" and landed on:', landed)
if (!landed.endsWith('/login')) throw new Error(`student app did not reach /login (got ${landed})`)
await page.screenshot({ path: `${OUT}/app-01-opens-student-login.png` })
console.log('  shot app-01-opens-student-login')

// ── 2. No teacher route offered inside the app ───────────────────────────────
const text = await page.evaluate(() => document.body.innerText)
if (/teacher/i.test(text)) throw new Error('student app shows a teacher route')
console.log('  no teacher route on the student login')

// ── 3. A teacher cannot sign in through the app (local only) ─────────────────
if (LOCAL) {
  const stamp = Date.now().toString(36)
  const teacher = `appcheck${stamp}`
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: teacher, email: `${teacher}@mindspark.test`, password: 'Passw0rd123' }),
  })
  if (res.status !== 201) throw new Error(`could not create the test teacher: ${res.status}`)

  await page.type('input[aria-label="Username"]', teacher)
  await page.type('input[type="password"]', 'Passw0rd123')
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Log In'))?.click()
  })
  await wait(4000)
  const after = await page.evaluate(() => document.body.innerText)
  if (!/app is for students/i.test(after)) {
    throw new Error('a teacher account was NOT blocked inside the student app')
  }
  await page.screenshot({ path: `${OUT}/app-02-teacher-blocked.png` })
  console.log('  shot app-02-teacher-blocked — teacher sign-in refused in the app')
}

await browser.close()
console.log('\nStudent-app behaviour OK.')
