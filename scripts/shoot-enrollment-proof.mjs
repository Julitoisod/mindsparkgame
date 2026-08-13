/**
 * Drives the real teacher dashboard in a headless browser and writes the
 * enrollment proof screenshots to proof-screenshots/.
 *
 *   1. npm run dev
 *   2. node scripts/shoot-enrollment-proof.mjs
 *
 * Two traps this script already works around — do not "simplify" them away:
 *   - The class-list CSV is written to the OS temp dir, never inside the
 *     project. Next's dev watcher touches files under the project root and the
 *     browser's File handle goes stale, so file.text() throws NotReadableError
 *     and the review table silently never renders.
 *   - Chromium comes from the Playwright cache; puppeteer-core ships no binary.
 */
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const CHROME = process.env.CHROME_PATH
  ?? 'C:/Users/ISOD/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'
const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = path.resolve(import.meta.dirname, '../proof-screenshots')
const CSV_PATH = path.join(os.tmpdir(), 'mindspark-classlist-proof.csv')

const stamp = Date.now().toString(36)
const TEACHER = `shoot${stamp}`
const PASS = 'Passw0rd123'

fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(
  CSV_PATH,
  'Last Name,First Name,Middle Name\nSantos,John Mark,Cruz\nReyes,Maria,Dela\nBautista,Ana,Lim',
)

const reg = await fetch(`${BASE}/api/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: TEACHER, email: `${TEACHER}@mindspark.test`, password: PASS }),
})
if (reg.status !== 201) throw new Error(`register failed: ${reg.status}`)

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 2 })

const wait = ms => new Promise(r => setTimeout(r, ms))
const shot = async (name, el) => {
  await (el ?? page).screenshot({ path: `${OUT}/${name}.png` })
  console.log('  shot', name)
}
/** The smallest card-sized <div> whose text contains `label`. */
const findCard = label => page.evaluateHandle(text => {
  const rect = d => d.getBoundingClientRect()
  return [...document.querySelectorAll('div')]
    .reverse()
    .find(d => d.textContent?.includes(text) && rect(d).height > 120 && rect(d).height < 900)
}, label)

// ── Log in ───────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
await page.waitForSelector('input')
const inputs = await page.$$('input')
await inputs[0].type(TEACHER)
await inputs[1].type(PASS)
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
  page.click('button[type=submit]'),
])
await wait(2500)

await page.goto(`${BASE}/teacher/dashboard`, { waitUntil: 'networkidle2' })
await wait(2000)

// A section must exist before either enrollment path is usable.
await page.evaluate(() => fetch('/api/teacher/classrooms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ name: 'Grade 3 - Emerald', schoolYear: '2026-2027' }),
}))
await page.reload({ waitUntil: 'networkidle2' })
await wait(2500)

// ── The two cards the panel asked about ──────────────────────────────────────
const csvCard = await findCard('Upload Official Class List')
await shot('r3-01-enrollment-no-template', csvCard.asElement())
const manualCard = await findCard('Manual Enrollment')
await shot('r3-02-manual-enrollment-kept', manualCard.asElement())
await shot('r3-03-dashboard-full')

// ── Upload → review → confirm ────────────────────────────────────────────────
for (const select of await page.$$('select')) {
  const value = await page.evaluate(el => el.querySelector('option:nth-child(2)')?.value ?? '', select)
  if (value) await select.select(value)
}
await wait(800)

const [fileInput] = await page.$$('input[type=file]')
await fileInput.uploadFile(CSV_PATH)
await page.waitForFunction(() => document.body.innerText.includes('Review student records'), { timeout: 15000 })
await shot('r3-04-csv-review', (await findCard('Review student records')).asElement())

await page.evaluate(() => {
  [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Confirm Enrollment'))?.click()
})
await page.waitForFunction(() => document.body.innerText.includes('Enrollment complete'), { timeout: 20000 })
await shot('r3-05-bulk-success', (await findCard('Enrollment complete')).asElement())
await shot('r3-06-dashboard-after')

await browser.close()
console.log('\nProof screenshots written to proof-screenshots/')
