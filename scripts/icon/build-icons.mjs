/**
 * Renders the MindSpark launcher icon (scripts/icon/*.svg) into every Android
 * density, plus a round version and the splash screen.
 *
 *   node scripts/icon/build-icons.mjs
 *
 * Uses the Playwright Chromium already on this machine — no image library and
 * no AI credits; the art is vector, so every size stays crisp.
 */
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = process.env.CHROME_PATH
  ?? 'C:/Users/ISOD/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'
const HERE = import.meta.dirname
const RES = path.resolve(HERE, '../../android/app/src/main/res')

// Android launcher sizes per density bucket
const DENSITIES = [
  ['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192],
]
// The adaptive foreground is drawn on a 108dp canvas, not 48dp
const FOREGROUND = [
  ['mdpi', 108], ['hdpi', 162], ['xhdpi', 216], ['xxhdpi', 324], ['xxxhdpi', 432],
]

const square = fs.readFileSync(path.join(HERE, 'mindspark-icon.svg'), 'utf8')
const foreground = fs.readFileSync(path.join(HERE, 'mindspark-foreground.svg'), 'utf8')

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()

/** Rasterise an SVG at an exact pixel size, optionally clipped to a circle. */
async function render(svg, size, outFile, { round = false } = {}) {
  const html = `<!doctype html><meta charset="utf-8">
    <style>
      html,body{margin:0;padding:0;background:transparent}
      #w{width:${size}px;height:${size}px;overflow:hidden;${round ? 'border-radius:50%;' : ''}}
      svg{width:${size}px;height:${size}px;display:block}
    </style>
    <div id="w">${svg}</div>`
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 })
  await page.setContent(html, { waitUntil: 'load' })
  const el = await page.$('#w')
  await el.screenshot({ path: outFile, omitBackground: true })
}

for (const [density, size] of DENSITIES) {
  const dir = path.join(RES, `mipmap-${density}`)
  fs.mkdirSync(dir, { recursive: true })
  await render(square, size, path.join(dir, 'ic_launcher.png'))
  await render(square, size, path.join(dir, 'ic_launcher_round.png'), { round: true })
  console.log(`  mipmap-${density}: ic_launcher + round @ ${size}px`)
}

for (const [density, size] of FOREGROUND) {
  const dir = path.join(RES, `mipmap-${density}`)
  await render(foreground, size, path.join(dir, 'ic_launcher_foreground.png'))
  console.log(`  mipmap-${density}: foreground @ ${size}px`)
}

// Splash: the bolt alone (no square tile) on the brand gradient, with the
// wordmark under it — a pasted icon tile shows its edges against the gradient.
const splashHtml = (w, h) => {
  const bolt = Math.min(w, h) * 0.55 // the art fills ~62% of this box
  return `<!doctype html><meta charset="utf-8">
  <style>
    html,body{margin:0;padding:0}
    #s{width:${w}px;height:${h}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(bolt * 0.14)}px;
       background:linear-gradient(135deg,#22326f 0%,#3459C7 60%,#6255E8 100%);
       font-family:"Segoe UI",system-ui,sans-serif}
    #s svg{width:${bolt}px;height:${bolt}px;display:block;filter:drop-shadow(0 ${Math.round(bolt * 0.04)}px ${Math.round(bolt * 0.08)}px rgba(0,0,0,.35))}
    b{color:#F4F2FF;font-size:${Math.round(bolt * 0.19)}px;letter-spacing:${Math.round(bolt * 0.03)}px;font-weight:800}
    small{color:#D9B8FF;font-size:${Math.round(bolt * 0.11)}px;letter-spacing:${Math.round(bolt * 0.05)}px;font-weight:700}
  </style>
  <div id="s">${foreground}<b>MINDSPARK</b><small>MATH</small></div>`
}

for (const [dir, w, h] of [
  ['drawable', 480, 800],
  ['drawable-port-mdpi', 320, 480], ['drawable-port-hdpi', 480, 800],
  ['drawable-port-xhdpi', 720, 1280], ['drawable-port-xxhdpi', 960, 1600], ['drawable-port-xxxhdpi', 1280, 1920],
  ['drawable-land-mdpi', 480, 320], ['drawable-land-hdpi', 800, 480],
  ['drawable-land-xhdpi', 1280, 720], ['drawable-land-xxhdpi', 1600, 960], ['drawable-land-xxxhdpi', 1920, 1280],
]) {
  const out = path.join(RES, dir, 'splash.png')
  if (!fs.existsSync(path.dirname(out))) continue
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  await page.setContent(splashHtml(w, h), { waitUntil: 'load' })
  await page.screenshot({ path: out })
  console.log(`  ${dir}/splash.png @ ${w}x${h}`)
}

await browser.close()
console.log('\nIcons and splash written into android/app/src/main/res.')
