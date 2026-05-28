/**
 * One-off script to replace hardcoded dark-green hex codes with purple/dark-navy
 * theme equivalents across the dashboard student pages.
 *
 * Run with: node scripts/replace-green-theme.js
 */
const fs = require('fs')
const path = require('path')

// Map of old green hex → new purple/navy hex
const colorMap = {
  // Dark backgrounds (panels, cards) — green → dark navy/purple
  '#041008': '#1a1233', // very dark green → very dark navy
  '#06170c': '#1a1233',
  '#082011': '#241a47',
  '#0d2b18': '#2e215b',
  '#123820': '#3b2a73',
  '#1b4a2b': '#4c3690',
  '#0a2915': '#241a47',
  '#07170d': '#0f0a1f',

  // Mid-greens (borders, accents) — green → purple
  '#00441b': '#581c87', // deep green → deep purple
  '#005121': '#6b21a8',
  '#006d2c': '#7e22ce',
  '#238b45': '#9333ea',
  '#41ab5d': '#a855f7',

  // Light greens (text-on-dark, hover bg) — green → light purple
  '#74c476': '#c084fc',
  '#a1d99b': '#d8b4fe',
  '#c7e9c0': '#e9d5ff',
  '#e5f5e0': '#f3e8ff',
  '#f7fcf5': '#faf5ff',

  // Replace gradient strings used in inline styles too
  'from-[#238b45]': 'from-[#9333ea]',
  'to-[#74c476]': 'to-[#c084fc]',
}

const targetDirs = [
  'app/dashboard',
  'app/character-select',
  'components/game',
  'components/ui',
]

const exts = new Set(['.tsx', '.ts', '.jsx', '.js', '.css'])

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      walk(full, files)
    } else if (exts.has(path.extname(entry.name))) {
      files.push(full)
    }
  }
  return files
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  const original = content

  for (const [oldColor, newColor] of Object.entries(colorMap)) {
    // Case-insensitive replacement of hex codes (but keep original-case substitutions safe)
    const regex = new RegExp(oldColor.replace(/[#]/g, '\\#'), 'gi')
    content = content.replace(regex, newColor)
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`  ✓ ${filePath}`)
    return true
  }
  return false
}

const root = process.cwd()
let changedCount = 0

console.log('Replacing green theme colors with purple theme...\n')

for (const dir of targetDirs) {
  const fullDir = path.join(root, dir)
  if (!fs.existsSync(fullDir)) {
    console.log(`  (skip — not found: ${dir})`)
    continue
  }
  console.log(`\nScanning ${dir}/`)
  const files = walk(fullDir)
  for (const file of files) {
    if (processFile(file)) changedCount++
  }
}

console.log(`\n✅ Done. ${changedCount} files updated.`)
