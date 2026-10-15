/**
 * Pulls still frames out of a video so they can be looked at.
 *
 *   node scripts/video-frames.mjs "<path to .mp4>" <outDir> [frameCount]
 *
 * Uses the installed Google Chrome (not the Playwright Chromium, which has no
 * H.264 decoder, and not the bundled ffmpeg, which is built without it either).
 */
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const [videoArg, outArg, countArg] = process.argv.slice(2)
if (!videoArg || !outArg) {
  console.error('usage: node scripts/video-frames.mjs <video> <outDir> [frames]')
  process.exit(1)
}
const COUNT = Number(countArg || 12)
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const out = path.resolve(outArg)
fs.mkdirSync(out, { recursive: true })
const fileUrl = 'file:///' + path.resolve(videoArg).replace(/\\/g, '/')

// The player page must itself live on file:// — a video loaded from file://
// into an about:blank/setContent document is blocked as cross-origin.
const playerPath = path.join(out, '_player.html')
fs.writeFileSync(playerPath, `<!doctype html><meta charset="utf-8">
  <style>html,body{margin:0;background:#000}video{width:100%;display:block}</style>
  <video id="v" src="${fileUrl}" preload="auto" muted></video>`)

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 120000,
  args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage()
await page.setViewport({ width: 900, height: 1600 })
await page.goto('file:///' + playerPath.split(path.sep).join('/'), { waitUntil: 'load' })

const meta = await page.evaluate(() => new Promise(resolve => {
  const v = document.getElementById('v')
  const done = () => resolve({ duration: v.duration, w: v.videoWidth, h: v.videoHeight })
  if (v.readyState >= 1) done(); else v.onloadedmetadata = done
  v.onerror = () => resolve({ error: 'cannot decode' })
  setTimeout(() => resolve({ error: 'timed out waiting for metadata' }), 20000)
}))
if (meta.error || !meta.duration) {
  console.error('Could not read the video:', meta.error ?? 'no duration')
  await browser.close()
  process.exit(1)
}
console.log(`video: ${meta.w}x${meta.h}, ${meta.duration.toFixed(1)}s`)

for (let i = 0; i < COUNT; i++) {
  const t = (meta.duration * (i + 0.5)) / COUNT
  const dataUrl = await page.evaluate(time => new Promise(resolve => {
    const v = document.getElementById('v')
    v.onseeked = () => {
      const c = document.createElement('canvas')
      const scale = Math.min(1, 520 / v.videoWidth)
      c.width = Math.round(v.videoWidth * scale)
      c.height = Math.round(v.videoHeight * scale)
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/png'))
    }
    v.currentTime = time
  }), t)
  const file = path.join(out, `frame-${String(i + 1).padStart(2, '0')}-${t.toFixed(1)}s.png`)
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'))
  console.log('  ' + path.basename(file))
}

await browser.close()
