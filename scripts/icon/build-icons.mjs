/**
 * Renders the MindSpark launcher icon into every Android density, plus a round
 * version and the splash screen.
 *
 *   node scripts/icon/build-icons.mjs
 *
 * Source art (Nov 2026): the panel's MindSpark Math knight logo,
 * scripts/icon/mindspark-logo.webp. Android rounds the corners itself — the
 * launcher masks every adaptive icon to its own shape (squircle or circle).
 * Uses the Playwright Chromium already on this machine — no image library.
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

const LOGO = `data:image/webp;base64,${fs.readFileSync(path.join(HERE, 'mindspark-logo.webp')).toString('base64')}`
// The logo's own edge blue — also ic_launcher_background, so the scaled-down
// adaptive foreground melts into the launcher tile with no visible seam.
const EDGE_BLUE = '#0140AE'
// Legacy square icon: the logo, full bleed
const square = `<img src="${LOGO}" style="width:100%;height:100%;display:block">`
// Adaptive foreground (108dp canvas): the logo shrunk so its art sits inside the
// launcher's safe zone, its edges feathered into the background colour
const foreground = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${EDGE_BLUE}">
  <img src="${LOGO}" style="width:80%;height:80%;display:block;-webkit-mask-image:radial-gradient(circle,#000 58%,transparent 71%);mask-image:radial-gradient(circle,#000 58%,transparent 71%)">
</div>`

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()

/** Rasterise an SVG at an exact pixel size, optionally clipped to a circle. */
async function render(svg, size, outFile, { round = false } = {}) {
  const html = `<!doctype html><meta charset="utf-8">
    <style>
      html,body{margin:0;padding:0;background:transparent}
      #w{width:${size}px;height:${size}px;overflow:hidden;${round ? 'border-radius:50%;' : ''}}
      #w > *{width:${size}px;height:${size}px;display:block}
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

// Splash: the logo as a rounded tile on the brand gradient (it carries its
// own "MindSpark Math" wordmark, so no extra text).
const splashHtml = (w, h) => {
  const tile = Math.round(Math.min(w, h) * 0.62)
  return `<!doctype html><meta charset="utf-8">
  <style>
    html,body{margin:0;padding:0}
    #s{width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;
       background:linear-gradient(135deg,#22326f 0%,#3459C7 60%,#6255E8 100%)}
    #s img{width:${tile}px;height:${tile}px;display:block;border-radius:22%;
       box-shadow:0 ${Math.round(tile * 0.04)}px ${Math.round(tile * 0.1)}px rgba(0,0,0,.4)}
  </style>
  <div id="s"><img src="${LOGO}"></div>`
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
